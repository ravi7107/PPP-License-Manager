namespace PPS.LicenseManager.API.Services.Interfaces;

/*
 * A file to attach to an outgoing email - held fully in memory (Content)
 * since the callers so far (approval-request links today; the PR PDF and
 * vendor quotation attachments in a follow-up) are all small enough
 * documents that streaming isn't worth the added complexity.
 */
public class EmailAttachment
{
    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = "application/octet-stream";

    public byte[] Content { get; set; } = Array.Empty<byte>();
}

/*
 * Sends transactional emails for the application. Registered today (see
 * Program.cs) as SmtpEmailService, backed by whatever the "Smtp" config
 * section points at (Gmail for now, per the deploy notes; swappable to a
 * company mailbox later purely via config, no code change). Falls back to
 * logging instead of sending if that config is incomplete, so every caller
 * already goes through this interface regardless of whether real sending
 * is currently configured.
 */
public interface IEmailService
{
    Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default);

    Task SendWithAttachmentsAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        IReadOnlyList<EmailAttachment> attachments,
        CancellationToken cancellationToken = default);
}
