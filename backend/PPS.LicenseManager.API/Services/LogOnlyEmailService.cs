using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Stub IEmailService that writes the email to the application log instead
 * of sending it. No SMTP server/credentials have been configured for this
 * environment yet - once they are, replace this registration in
 * Program.cs with a real implementation (e.g. an SmtpEmailService) without
 * touching any caller, since every caller already goes through
 * IEmailService rather than this class directly.
 */
public class LogOnlyEmailService : IEmailService
{
    private readonly ILogger<LogOnlyEmailService> _logger;

    public LogOnlyEmailService(ILogger<LogOnlyEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[EMAIL STUB] Would send email to {ToName} <{ToEmail}> - Subject: {Subject}\n{HtmlBody}",
            toName,
            toEmail,
            subject,
            htmlBody);

        return Task.CompletedTask;
    }

    public Task SendWithAttachmentsAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        IReadOnlyList<EmailAttachment> attachments,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[EMAIL STUB] Would send email to {ToName} <{ToEmail}> - Subject: {Subject} - Attachments: {AttachmentNames}\n{HtmlBody}",
            toName,
            toEmail,
            subject,
            string.Join(", ", attachments.Select(a => a.FileName)),
            htmlBody);

        return Task.CompletedTask;
    }
}
