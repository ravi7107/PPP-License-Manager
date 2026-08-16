using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

/*
 * Body for both POST {id}/approve and POST {id}/reject - which action
 * happens is decided by which endpoint was called, not a field here, same
 * split as Purchase Requisition's approve/reject actions.
 */
public class DecideMaterialMovementRequest
{
    [MaxLength(500)]
    public string? Comments { get; set; }
}
