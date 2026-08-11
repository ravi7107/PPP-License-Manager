using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A record of one "Share with Finance" action - the PR PDF plus any
 * vendor-quotation attachments emailed to Finance. Finance is addressed by
 * email (not modeled as an in-app user/role), so this only stores an email
 * address, not a User FK. Every share (including re-shares) gets its own
 * row and its own PurchaseRequisitionAuditLog entry.
 */
public class PurchaseRequisitionFinanceNotification
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string SentToEmail { get; set; } = string.Empty;

    [Required]
    public int SentByUserId { get; set; }

    public User SentByUser { get; set; } = null!;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    // Sent, Failed
    [Required]
    [MaxLength(20)]
    public string DeliveryStatus { get; set; } = "Sent";

    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    [MaxLength(200)]
    public string? EmailMessageId { get; set; }
}
