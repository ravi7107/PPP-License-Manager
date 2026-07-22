namespace PPS.LicenseManager.API.DTOs.Responses;

public class UserListResponse
{
    public List<UserResponse> Users { get; set; } = new();

    public int TotalRecords { get; set; }
}
