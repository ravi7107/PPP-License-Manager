namespace PPS.LicenseManager.API.Services.Interfaces;

/*
 * Sends transactional emails for the application. The only implementation
 * registered today (see Program.cs) is LogOnlyEmailService, which writes
 * the would-be email to the application log instead of an SMTP server -
 * no SMTP credentials have been supplied for this environment yet.
 * Swapping in a real SMTP/API-based implementation later only requires
 * changing the DI registration; every caller already goes through this
 * interface.
 */
public interface IEmailService
{
    Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default);
}
