using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One dispatch record per movement (one-to-one via the unique index on
 * MovementId - see ApplicationDbContext). Created when an Approved
 * movement is dispatched; GatePassPdfPath/QrPayload are set once the Gate
 * Pass PDF is generated (same "generated PDF is a system artifact, lives
 * in App_Data, not in Attachments" convention as
 * PurchaseRequisition.PdfPath).
 */
public class MaterialMovementDispatch
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    [Required]
    public int DispatchedByUserId { get; set; }
    public User DispatchedByUser { get; set; } = null!;

    public DateTime DispatchedAt { get; set; } = DateTime.UtcNow;

    public int? TransporterId { get; set; }
    public MaterialTransporter? Transporter { get; set; }

    [MaxLength(30)]
    public string? VehicleNumber { get; set; }

    [MaxLength(30)]
    public string? GatePassNumber { get; set; }

    [MaxLength(300)]
    public string? GatePassPdfPath { get; set; }

    [MaxLength(500)]
    public string? QrPayload { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
