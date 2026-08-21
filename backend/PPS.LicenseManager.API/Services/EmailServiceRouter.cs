using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Picks which real IEmailService implementation actually sends, in
 * preference order:
 *   1. GraphEmailService (Microsoft Graph, OAuth2) - the intended path
 *      for the shared "approvals" mailbox - if its GraphMail config
 *      section is fully filled in.
 *   2. SmtpEmailService (Basic Auth SMTP) - a working fallback, e.g.
 *      during any window before Graph is fully set up - if ITS Smtp
 *      config section is fully filled in.
 *   3. LogOnlyEmailService - so every caller still gets a safe no-op
 *      rather than an exception when neither transport is configured
 *      yet, matching the existing "log instead of throw" discipline
 *      each concrete implementation already has on its own.
 *
 * Registered in Program.cs as the sole IEmailService - every caller in
 * this codebase already only depends on IEmailService, never a
 * concrete class, so nothing else needs to change to pick up Graph once
 * it's configured.
 */
public class EmailServiceRouter : IEmailService
{
    private readonly GraphEmailService _graphEmailService;
    private readonly SmtpEmailService _smtpEmailService;
    private readonly LogOnlyEmailService _logOnlyEmailService;

    public EmailServiceRouter(
        GraphEmailService graphEmailService,
        SmtpEmailService smtpEmailService,
        LogOnlyEmailService logOnlyEmailService)
    {
        _graphEmailService = graphEmailService;
        _smtpEmailService = smtpEmailService;
        _logOnlyEmailService = logOnlyEmailService;
    }

    private IEmailService Resolve()
    {
        if (_graphEmailService.IsConfigured)
        {
            return _graphEmailService;
        }

        if (_smtpEmailService.IsConfigured)
        {
            return _smtpEmailService;
        }

        return _logOnlyEmailService;
    }

    public Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
        => Resolve().SendAsync(toEmail, toName, subject, htmlBody, cancellationToken);

    public Task SendWithAttachmentsAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        IReadOnlyList<EmailAttachment> attachments,
        CancellationToken cancellationToken = default)
        => Resolve().SendWithAttachmentsAsync(
            toEmail,
            toName,
            subject,
            htmlBody,
            attachments,
            cancellationToken);
}
