using System.Net;
using System.Net.Mail;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Real IEmailService implementation using the built-in System.Net.Mail -
 * deliberately not a third-party library like MailKit, since there's no
 * `dotnet` CLI in this project's deploy/verification pipeline to restore
 * and confirm a new NuGet package resolves; System.Net.Mail ships in the
 * shared framework already targeted (net10.0), so this needs zero new
 * PackageReference entries.
 *
 * Reads Host/Port/EnableSsl/Username/Password/FromAddress/FromName from
 * the "Smtp" config section (see appsettings.json). If Username or
 * Password is blank - e.g. right after this feature deploys, before
 * anyone has filled in real credentials - this falls back to logging
 * instead of attempting to connect, at Warning level with a message
 * distinct from LogOnlyEmailService's own stub message, so it's easy to
 * grep for "mail isn't actually going out yet" versus the old intentional
 * log-only mode.
 *
 * Gmail specifically requires an App Password (regular account password
 * auth is disabled for most accounts) - see the "Smtp" section's comment
 * in appsettings.json for exactly how to generate one.
 */
public class SmtpEmailService : IEmailService
{
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly IConfiguration _configuration;

    public SmtpEmailService(
        ILogger<SmtpEmailService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    private bool TryGetSmtpConfig(
        out string host,
        out int port,
        out bool enableSsl,
        out string username,
        out string password,
        out string fromAddress,
        out string fromName)
    {
        var section = _configuration.GetSection("Smtp");

        host = section["Host"] ?? string.Empty;
        port = int.TryParse(section["Port"], out var parsedPort) ? parsedPort : 587;
        enableSsl = !bool.TryParse(section["EnableSsl"], out var parsedSsl) || parsedSsl;
        username = section["Username"] ?? string.Empty;
        password = section["Password"] ?? string.Empty;
        fromAddress = section["FromAddress"] ?? string.Empty;
        fromName = section["FromName"] ?? "PPS SmartAsset";

        return !string.IsNullOrWhiteSpace(host)
            && !string.IsNullOrWhiteSpace(username)
            && !string.IsNullOrWhiteSpace(password)
            && !string.IsNullOrWhiteSpace(fromAddress);
    }

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
        if (!TryGetSmtpConfig(
                out var host,
                out var port,
                out var enableSsl,
                out var username,
                out var password,
                out var fromAddress,
                out var fromName))
        {
            _logger.LogWarning(
                "SMTP not configured — email NOT sent. Would have gone to {ToName} <{ToEmail}> - Subject: {Subject} - Attachments: {AttachmentNames}. Fill in the Smtp section of appsettings.json to enable real sending.",
                toName,
                toEmail,
                subject,
                string.Join(", ", attachments.Select(a => a.FileName)));

            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(fromAddress, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            message.To.Add(new MailAddress(toEmail, toName));

            foreach (var attachment in attachments)
            {
                var stream = new MemoryStream(attachment.Content);
                message.Attachments.Add(
                    new Attachment(stream, attachment.FileName, attachment.ContentType));
            }

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password)
            };

            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            // Never let an email failure break the caller's own workflow
            // (approval-link delivery, future Finance notification, etc.)
            // - log it clearly and move on, same best-effort discipline as
            // PDF generation elsewhere in the Purchase Requisition module.
            _logger.LogError(
                ex,
                "Failed to send email to {ToName} <{ToEmail}> - Subject: {Subject}",
                toName,
                toEmail,
                subject);
        }
    }
}
