using PPS.LicenseManager.API.DTOs.Availability;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IAvailabilityService
{
    Task<IEnumerable<UserUnavailabilityResponse>>
        GetUnavailabilitiesAsync();

    Task<UserUnavailabilityResponse?>
        GetUnavailabilityByIdAsync(int id);

    Task<UserUnavailabilityResponse>
        CreateUnavailabilityAsync(
            CreateUserUnavailabilityRequest request);

    Task<bool>
        CancelUnavailabilityAsync(
            int id,
            CancelUserUnavailabilityRequest request);

    Task<IEnumerable<AvailableLicenseResourceResponse>>
        GetAvailableLicenseResourcesAsync();

    Task<IEnumerable<ResourceReallocationResponse>>
        GetReallocationRequestsAsync();

    Task<ResourceReallocationResponse>
        CreateReallocationRequestAsync(
            CreateResourceReallocationRequest request);

    Task<ResourceReallocationResponse?>
        DecideReallocationRequestAsync(
            int id,
            DecideResourceReallocationRequest request);

    Task<ResourceReallocationResponse?>
        ReturnReallocationToOriginalUserAsync(
            int id,
            ReturnResourceReallocationRequest request);
}
