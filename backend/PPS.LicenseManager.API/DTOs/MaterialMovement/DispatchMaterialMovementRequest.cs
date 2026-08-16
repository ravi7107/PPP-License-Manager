namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class DispatchMaterialMovementRequest
{
    public int? TransporterId { get; set; }

    public string? VehicleNumber { get; set; }
}
