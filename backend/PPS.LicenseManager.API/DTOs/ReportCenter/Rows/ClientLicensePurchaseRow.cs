namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

// Grain: one row per LicensePurchase that has a Client set (ClientId !=
// null) - covers both real-world scenarios the business described:
// PurchasedByType == "Entity" means PPS bought the license itself but the
// purchase is scoped to this client's project (an internal Company is
// also set); PurchasedByType == "Client" means the client supplied/holds
// the license themselves and this row exists purely to track its cost
// against that client's project. PurchasedByLabel is a display-only
// enrichment of PurchasedByType, computed in C# after materialization
// (see EnrichClientLicensePurchaseRows) - not in the LINQ projection.
public class ClientLicensePurchaseRow
{
    public int Id { get; set; }

    public string ClientName { get; set; } = string.Empty;

    public string PurchasedByType { get; set; } = string.Empty;

    public string PurchasedByLabel { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string? DepartmentName { get; set; }

    public string SoftwareName { get; set; } = string.Empty;

    public string Vendor { get; set; } = string.Empty;

    public string LicenseType { get; set; } = string.Empty;

    public int TotalLicenses { get; set; }

    public DateOnly PurchaseDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public decimal? Cost { get; set; }

    public string? Currency { get; set; }

    public string? PONumber { get; set; }

    public string? InvoiceNumber { get; set; }

    public string? Remarks { get; set; }
}
