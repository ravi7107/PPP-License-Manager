namespace PPS.LicenseManager.API.Common;

public class PagedResponse<T>
{
    public List<T> Items { get; set; } = new();

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalRecords { get; set; }

    public int TotalPages =>
        (int)Math.Ceiling((double)TotalRecords / PageSize);
}
