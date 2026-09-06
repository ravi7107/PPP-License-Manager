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
            new()
            {
                Id = "warranty-expiry",
                Title = "Warranty Expiry",
                Category = "Assets",
                Description = "Assets already out of warranty or expiring within 90 days. Set a Warranty Expiry date range to override the default 90-day window.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "locationId", Label = "Location", Type = "location" },
                    new() { Key = "dateRange", Label = "Warranty Expiry Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetWarrantyExpiryPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetWarrantyExpiryExportAsync(req, restricted, companyId, user),
            },
            new()
            {
                Id = "asset-allocation",
                Title = "Asset Allocation",
                Category = "Assets",
                Description = "Hardware assignment history - who has (or had) which asset, and when. No Location filter: Asset.CurrentLocationId only reflects a completed Material Movement, not who currently holds the asset.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "status", Label = "Status", Type = "status", Options = new[] { "Active", "Assigned", "Returned" } },
                    new() { Key = "dateRange", Label = "Assigned On", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetAssetAllocationPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetAssetAllocationExportAsync(req, restricted, companyId, user),
            },
            new()
            {
                Id = "asset-ageing",
                Title = "Asset Ageing",
                Category = "Assets",
                Description = "Assets bucketed by age since purchase (0-1, 1-3, 3-5, 5+ years), by entity and department.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "status", Label = "Status", Type = "status", Options = AssetStatusOptions },
                    new() { Key = "dateRange", Label = "Purchase Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetAssetAgeingPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetAssetAgeingExportAsync(req, restricted, companyId, user),
            },
            new()
            {
                Id = "data-quality",
                Title = "Data Quality",
                Category = "Assets",
                Description = "Flags concrete data-integrity issues across Assets, Licenses, and License Purchases (missing serial numbers, stale statuses, missing vendor). Super Admin / IT Admin only.",
                RequiredRoles = new[] { "Super Admin", "IT Admin" },
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetDataQualityPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetDataQualityExportAsync(req, restricted, companyId, user),
            },
        };
    }
}
