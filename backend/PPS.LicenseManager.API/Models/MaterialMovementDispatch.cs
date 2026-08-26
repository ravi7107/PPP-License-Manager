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

    // Set once Facility's mobile "Transfer" tap confirms the goods
    // physically left - distinct from DispatchedByUserId/DispatchedAt
    // above, which (since Phase 4 of the QR-driven material movement
    // plan) record who/when the gate pass was generated (the final
    // approver), not who physically handed the goods over. Null until
    // MaterialMovementService.TransferAsync runs; never set at all for
    // movements dispatched via the pre-Phase-4 manual Dispatch endpoint,
    // since those go straight from Approved to Dispatched with no
    // separate transfer step.
    public int? TransferredByUserId { get; set; }
    public User? TransferredByUser { get; set; }

    public DateTime? TransferredAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
