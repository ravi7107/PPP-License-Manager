namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class ItCostSummaryResponse
{
    public decimal TotalAssetCost { get; set; }

    public decimal TotalLicenseCost { get; set; }

    public decimal TotalApprovedPurchaseCost { get; set; }

    public decimal GrandTotal { get; set; }

    public int AssetCount { get; set; }

    public int LicenseCount { get; set; }

    public int ApprovedPurchaseCount { get; set; }

    public List<ItCostByEntityRow> ByEntity { get; set; } = new();

    public List<ItCostByDepartmentRow> ByDepartment { get; set; } = new();
}

public class ItCostByEntityRow
{
    public string EntityName { get; set; } = string.Empty;

    public decimal AssetCost { get; set; }

    public decimal LicenseCost { get; set; }

    public decimal TotalCost { get; set; }
}

public class ItCostByDepartmentRow
{
    public string DepartmentName { get; set; } = string.Empty;

    public string? EntityName { get; set; }

    public decimal AssetCost { get; set; }

    public decimal LicenseCost { get; set; }

    public decimal TotalCost { get; set; }
}
