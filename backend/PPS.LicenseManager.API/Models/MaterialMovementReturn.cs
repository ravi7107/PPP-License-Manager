using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Round-trip tracking for MovementType == "TemporaryMovement" - created
 * alongside the movement's dispatch, closed out when the material actually
 * comes back. Status: Pending, Returned, Overdue (a scheduled check flips
 * Pending -> Overdue once ExpectedReturnDate passes; that job is Phase 9
 * work, not part of this schema-only migration).
 */
public class MaterialMovementReturn
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    public int? ReturnedByUserId { get; set; }
    public User? ReturnedByUser { get; set; }

    public DateTime? ReturnedAt { get; set; }

    public DateTime ExpectedReturnDate { get; set; }

    public DateTime? ActualReturnDate { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
