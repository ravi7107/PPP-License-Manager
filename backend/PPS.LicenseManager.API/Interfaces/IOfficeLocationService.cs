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

    Task<OfficeSeatResponse>
        CreateSeatAsync(
            CreateOfficeSeatRequest request);

    Task<OfficeSeatResponse?>
        UpdateSeatAsync(
            int id,
            UpdateOfficeSeatRequest request);

    Task<bool>
        DeleteSeatAsync(int id);
}
