using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Http;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Real IEmailService implementation using Microsoft Graph's sendMail
 * action with app-only (OAuth2 client-credentials) authentication -
 * deliberately plain HttpClient + System.Text.Json rather than the
 * Microsoft.Graph SDK, for the same reason SmtpEmailService avoids
 * MailKit (see that class's own comment): there's no `dotnet` CLI in
 * this project's deploy/verification pipeline to restore and confirm a
 * new NuGet package resolves. Both HttpClient (via IHttpClientFactory)
 * and System.Text.Json ship in the ASP.NET Core shared framework
 * already targeted (net10.0), so this needs zero new PackageReference
 * entries.
 *
 * Reads TenantId/ClientId/ClientSecret/SenderAddress from the
 * "GraphMail" config section. Sends "as" SenderAddress - intended to be
 * a Microsoft 365 shared mailbox (e.g. approvals@ppspl.in) this app's
 * registration has been granted Mail.Send access to via an Exchange
 * Online Application Access Policy scoped to just that one address.
 * Application permissions are tenant-wide by default - the Access
 * Policy is what actually restricts this app to sending as only the one
 * mailbox it's meant for, not any mailbox in the tenant.
 *
 * The access token is cached in-process (static, thread-safe via a
 * SemaphoreSlim) and reused until shortly before its own expiry, rather
 * than fetched fresh on every email - client-credentials tokens are
 * valid ~60 minutes and this service is registered Scoped (a new
 * instance per request), so without a shared cache a burst of
 * approval-chain emails would each pay a full token round-trip.
 */
public class GraphEmailService : IEmailService
{
    private const string GraphSendMailScope = "https://graph.microsoft.com/.default";

    private static readonly SemaphoreSlim TokenLock = new(1, 1);
    private static string? _cachedAccessToken;
    private static DateTimeOffset _cachedAccessTokenExpiresAt = DateTimeOffset.MinValue;

    private readonly ILogger<GraphEmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public GraphEmailService(
        ILogger<GraphEmailService> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    private bool TryGetGraphConfig(
        out string tenantId,
        out string clientId,
        out string clientSecret,
        out string senderAddress)
    {
        var section = _configuration.GetSection("GraphMail");

        tenantId = section["TenantId"] ?? string.Empty;
        clientId = section["ClientId"] ?? string.Empty;
        clientSecret = section["ClientSecret"] ?? string.Empty;
        senderAddress = section["SenderAddress"] ?? string.Empty;

        return !string.IsNullOrWhiteSpace(tenantId)
            && !string.IsNullOrWhiteSpace(clientId)
            && !string.IsNullOrWhiteSpace(clientSecret)
            && !string.IsNullOrWhiteSpace(senderAddress);
    }

    // Exposed so EmailServiceRouter can check configuration completeness
    // up front without duplicating this logic or attempting a send.
    public bool IsConfigured => TryGetGraphConfig(out _, out _, out _, out _);

    public async Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        await SendWithAttachmentsAsync(
            toEmail,
            toName,
            subject,
            htmlBody,
            Array.Empty<EmailAttachment>(),
            cancellationToken);
    }

    public async Task SendWithAttachmentsAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        IReadOnlyList<EmailAttachment> attachments,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetGraphConfig(
                out var tenantId,
                out var clientId,
                out var clientSecret,
                out var senderAddress))
        {
            _logger.LogWarning(
                "Graph mail not configured — email NOT sent. Would have gone to {ToName} <{ToEmail}> - Subject: {Subject} - Attachments: {AttachmentNames}. Fill in the GraphMail section of appsettings.json to enable real sending.",
                toName,
                toEmail,
                subject,
                string.Join(", ", attachments.Select(a => a.FileName)));

            return;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();

            var accessToken = await GetAccessTokenAsync(
                httpClient,
                tenantId,
                clientId,
                clientSecret,
                cancellationToken);

            var requestBody = new GraphSendMailRequest
            {
                Message = new GraphMessage
                {
                    Subject = subject,
                    Body = new GraphMessageBody
                    {
                        ContentType = "HTML",
                        Content = htmlBody
                    },
                    ToRecipients = new List<GraphRecipient>
                    {
                        new()
                        {
                            EmailAddress = new GraphEmailAddress
                            {
                                Address = toEmail,
                                Name = toName
                            }
                        }
                    },
                    Attachments = attachments.Select(a => new GraphFileAttachment
                    {
                        Name = a.FileName,
                        ContentType = a.ContentType,
                        ContentBytes = Convert.ToBase64String(a.Content)
                    }).ToList()
                },
                SaveToSentItems = false
            };

            var sendMailUrl =
                $"https://graph.microsoft.com/v1.0/users/{Uri.EscapeDataString(senderAddress)}/sendMail";

            using var sendRequest = new HttpRequestMessage(HttpMethod.Post, sendMailUrl)
            {
                Content = JsonContent.Create(requestBody)
            };
            sendRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var sendResponse = await httpClient.SendAsync(sendRequest, cancellationToken);

            if (!sendResponse.IsSuccessStatusCode)
            {
                var errorBody = await sendResponse.Content.ReadAsStringAsync(cancellationToken);

                throw new InvalidOperationException(
                    $"Graph sendMail failed with {(int)sendResponse.StatusCode} {sendResponse.StatusCode}: {errorBody}");
            }
        }
        catch (Exception ex)
        {
            // Never let an email failure break the caller's own workflow
            // (approval-link delivery, Finance notification, PO-ready
            // notice, etc.) - log it clearly and move on, same
            // best-effort discipline as SmtpEmailService and PDF
            // generation elsewhere in the Purchase Requisition module.
            _logger.LogError(
                ex,
                "Failed to send email via Graph to {ToName} <{ToEmail}> - Subject: {Subject}",
                toName,
                toEmail,
                subject);
        }
    }

    private static async Task<string> GetAccessTokenAsync(
        HttpClient httpClient,
        string tenantId,
        string clientId,
        string clientSecret,
        CancellationToken cancellationToken)
    {
        await TokenLock.WaitAsync(cancellationToken);
        try
        {
            // 2-minute safety margin before the token's own expiry so a
            // cache hit doesn't hand back something that dies mid-request.
            if (_cachedAccessToken != null
                && DateTimeOffset.UtcNow < _cachedAccessTokenExpiresAt.AddMinutes(-2))
            {
                return _cachedAccessToken;
            }

            var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";

            var formValues = new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["scope"] = GraphSendMailScope,
                ["client_secret"] = clientSecret,
                ["grant_type"] = "client_credentials"
            };

            using var content = new FormUrlEncodedContent(formValues);
            using var response = await httpClient.PostAsync(tokenUrl, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);

                throw new InvalidOperationException(
                    $"Failed to acquire a Microsoft Graph access token ({(int)response.StatusCode} {response.StatusCode}): {errorBody}");
            }

            var tokenResponse = await response.Content.ReadFromJsonAsync<GraphTokenResponse>(
                cancellationToken: cancellationToken);

            if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
            {
                throw new InvalidOperationException(
                    "Empty or invalid token response from Microsoft identity platform.");
            }

            _cachedAccessToken = tokenResponse.AccessToken;
            _cachedAccessTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(tokenResponse.ExpiresIn);

            return _cachedAccessToken;
        }
        finally
        {
            TokenLock.Release();
        }
    }

    private sealed class GraphTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty;
    }

    private sealed class GraphSendMailRequest
    {
        [JsonPropertyName("message")]
        public GraphMessage Message { get; set; } = new();

        [JsonPropertyName("saveToSentItems")]
        public bool SaveToSentItems { get; set; }
    }

    private sealed class GraphMessage
    {
        [JsonPropertyName("subject")]
        public string Subject { get; set; } = string.Empty;

        [JsonPropertyName("body")]
        public GraphMessageBody Body { get; set; } = new();

        [JsonPropertyName("toRecipients")]
        public List<GraphRecipient> ToRecipients { get; set; } = new();

        [JsonPropertyName("attachments")]
        public List<GraphFileAttachment> Attachments { get; set; } = new();
    }

    private sealed class GraphMessageBody
    {
        [JsonPropertyName("contentType")]
        public string ContentType { get; set; } = "HTML";

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private sealed class GraphRecipient
    {
        [JsonPropertyName("emailAddress")]
        public GraphEmailAddress EmailAddress { get; set; } = new();
    }

    private sealed class GraphEmailAddress
    {
        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private sealed class GraphFileAttachment
    {
        [JsonPropertyName("@odata.type")]
        public string OdataType { get; set; } = "#microsoft.graph.fileAttachment";

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("contentType")]
        public string ContentType { get; set; } = string.Empty;

        [JsonPropertyName("contentBytes")]
        public string ContentBytes { get; set; } = string.Empty;
    }
}
