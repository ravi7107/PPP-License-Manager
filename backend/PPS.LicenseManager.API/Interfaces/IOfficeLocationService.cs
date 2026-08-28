using PPS.LicenseManager.API.DTOs.OfficeLocation;

namespace PPS.LicenseManager.API.Interfaces;

public interface IOfficeLocationService
{
    // =========================================================
    // OFFICE LOCATIONS
    // =========================================================

    Task<IEnumerable<OfficeLocationResponse>>
        GetLocationsAsync();

    Task<IEnumerable<OfficeLocationResponse>>
        GetLocationsByCompanyAsync(int companyId);

    Task<OfficeLocationResponse?>
        GetLocationByIdAsync(int id);

    Task<OfficeLocationResponse>
        CreateLocationAsync(
            CreateOfficeLocationRequest request);

    Task<OfficeLocationResponse?>
        UpdateLocationAsync(
            int id,
            UpdateOfficeLocationRequest request);

    Task<bool>
        DeleteLocationAsync(int id);


    // =========================================================
    // FLOORS
    // =========================================================

    Task<IEnumerable<OfficeFloorResponse>>
        GetFloorsAsync();

    Task<IEnumerable<OfficeFloorResponse>>
        GetFloorsByLocationAsync(int officeLocationId);

    Task<OfficeFloorResponse?>
        GetFloorByIdAsync(int id);

    Task<OfficeFloorResponse>
        CreateFloorAsync(
            CreateOfficeFloorRequest request);

    Task<OfficeFloorResponse?>
        UpdateFloorAsync(
            int id,
            UpdateOfficeFloorRequest request);

    Task<bool>
        DeleteFloorAsync(int id);

    Task<OfficeFloorResponse?>
        UploadFloorMapAsync(
            int id,
            IFormFile file,
            string webRootPath);

    Task<bool>
        RemoveFloorMapAsync(
            int id,
            string webRootPath);


    // =========================================================
    // SEATS
    // =========================================================

    Task<IEnumerable<OfficeSeatResponse>>
        GetSeatsAsync();

    Task<IEnumerable<OfficeSeatResponse>>
        GetSeatsByFloorAsync(int officeFloorId);

    Task<OfficeSeatResponse?>
        GetSeatByIdAsync(int id);

    // Phase 12 - actingUserId is the admin performing this edit, recorded
    // as AssignedByUserId on any AssetAssignment row this seat edit
    // creates/closes when the seat's Asset/User/Department pairing implies
    // a real assignment or department change (see SyncAssetFromSeatAsync).
    Task<OfficeSeatResponse>
        CreateSeatAsync(
            CreateOfficeSeatRequest request,
            int actingUserId);

    Task<OfficeSeatResponse?>
        UpdateSeatAsync(
            int id,
            UpdateOfficeSeatRequest request,
            int actingUserId);

    Task<bool>
        DeleteSeatAsync(int id);

    // Sets (or clears, when both are null) which asset/user occupy a seat,
    // reusing the same validation CreateSeatAsync/UpdateSeatAsync apply
    // (department/company match, no double-booking an asset or user across
    // seats). Used by AssetAssignmentService to keep the floor map in sync
    // with real hardware allocations. Returns null if the seat doesn't
    // exist.
    Task<OfficeSeatResponse?>
        SetSeatOccupantAsync(
            int seatId,
            int? assetId,
            int? userId);
}
