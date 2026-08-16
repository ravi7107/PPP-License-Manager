namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementDispatchResponse
{
    public int Id { get; set; }

    public int DispatchedByUserId { get; set; }
    public string DispatchedByUserName { get; set; } = string.Empty;
    public DateTime DispatchedAt { get; set; }

    public int? TransporterId { get; set; }
    public string? TransporterName { get; set; }
    public string? VehicleNumber { get; set; }

    public string? GatePassNumber { get; set; }

    // The frontend uses this to decide whether to show a "Download Gate
    // Pass" link - GatePassPdfPath itself is a server-local physical path
    // and is never sent to the client (same convention as
    // PurchaseRequisitionResponse never exposing PdfPath directly).
    public bool HasGatePassPdf { get; set; }
}
