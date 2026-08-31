namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class ClientCostSummaryRow
{
    public string ClientName { get; set; } = string.Empty;

    public string ClientCode { get; set; } = string.Empty;

    public int SoftwareTitles { get; set; }

    public int PurchaseCount { get; set; }

    public int TotalSeats { get; set; }

    public int LicenseCount { get; set; }

    public int AllocatedSeats { get; set; }

    public decimal TotalCost { get; set; }
}
