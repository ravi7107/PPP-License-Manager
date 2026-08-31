namespace PPS.LicenseManager.API.Services.ReportCenter;

internal static class ReportCatalog
{
    private static readonly string[] AssetStatusOptions =
        { "Available", "Assigned", "Maintenance", "Reserved", "Retired" };

    private static readonly string[] LicenseStatusOptions =
        { "Available", "Allocated", "Expired" };

    public static List<ReportDefinition> Build(ReportCenterService service)
    {
        return new List<ReportDefinition>
        {
            new()
            {
                Id = "asset-register",
                Title = "Asset Register",
                Category = "Assets",
                Description = "Complete hardware asset inventory with entity, department, location, ownership, and cost detail.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "locationId", Label = "Location", Type = "location" },
                    new() { Key = "status", Label = "Status", Type = "status", Options = AssetStatusOptions },
                    new() { Key = "assetType", Label = "Asset Type", Type = "text" },
                    new() { Key = "dateRange", Label = "Purchase Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetAssetRegisterPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetAssetRegisterExportAsync(req, restricted, companyId, user, "Asset Register", "Asset_Register"),
            },
            new()
            {
                Id = "available-assets",
                Title = "Available Assets",
                Category = "Assets",
                Description = "Assets currently available and ready to allocate, by entity, department, and location.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "locationId", Label = "Location", Type = "location" },
                    new() { Key = "assetType", Label = "Asset Type", Type = "text" },
                    new() { Key = "dateRange", Label = "Purchase Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetAssetRegisterPreviewAsync(
                        ReportCenterService.WithForcedStatus(req, "Available"), restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetAssetRegisterExportAsync(
                        ReportCenterService.WithForcedStatus(req, "Available"), restricted, companyId, user,
                        "Available Assets", "Available_Assets"),
            },
            new()
            {
                Id = "assets-under-maintenance",
                Title = "Assets Under Maintenance",
                Category = "Assets",
                Description = "Assets currently flagged as under maintenance.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "locationId", Label = "Location", Type = "location" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetAssetRegisterPreviewAsync(
                        ReportCenterService.WithForcedStatus(req, "Maintenance"), restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetAssetRegisterExportAsync(
                        ReportCenterService.WithForcedStatus(req, "Maintenance"), restricted, companyId, user,
                        "Assets Under Maintenance", "Assets_Under_Maintenance"),
            },
            new()
            {
                Id = "license-register",
                Title = "License Register",
                Category = "Licensing",
                Description = "Complete software license inventory. Entity/Department filters only match licenses linked to a purchase batch.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "softwareId", Label = "Software", Type = "software" },
                    new() { Key = "status", Label = "Status", Type = "status", Options = LicenseStatusOptions },
                    new() { Key = "dateRange", Label = "Expiry Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetLicenseRegisterPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetLicenseRegisterExportAsync(req, restricted, companyId, user, "License Register", "License_Register"),
            },
            new()
            {
                Id = "it-cost-summary",
                Title = "IT Cost Summary",
                Category = "Executive",
                Description = "Rollup of asset, license, and approved purchase spend, broken down by entity and department.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "dateRange", Label = "Date Range", Type = "dateRange" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetItCostSummaryPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetItCostSummaryExportAsync(req, restricted, companyId, user),
            },
        };
    }
}
