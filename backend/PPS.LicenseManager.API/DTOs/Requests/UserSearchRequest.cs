namespace PPS.LicenseManager.API.DTOs.Requests;

public class UserSearchRequest
{
    public string? Search { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
