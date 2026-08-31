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
                Id = "client-cost-summary",
                Title = "Client Cost Summary",
                Category = "Clients",
                Description = "License purchases billed to each client: titles, pool seats, allocated seats, and cost.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "clientId", Label = "Client", Type = "client" },
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "dateRange", Label = "Purchase Date", Type = "dateRange" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetClientCostSummaryPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetClientCostSummaryExportAsync(req, restricted, companyId, user),
            },
            new()
            {
                Id = "client-license-register",
                Title = "Client License Register",
                Category = "Clients",
                Description = "Individual licenses tied to a client through a client-billed purchase.",
                Filters = new List<ReportFilterFieldDefinition>
                {
                    new() { Key = "clientId", Label = "Client", Type = "client" },
                    new() { Key = "companyId", Label = "Entity", Type = "company" },
                    new() { Key = "departmentId", Label = "Department", Type = "department" },
                    new() { Key = "softwareId", Label = "Software", Type = "software" },
                    new() { Key = "status", Label = "Status", Type = "status", Options = LicenseStatusOptions },
                    new() { Key = "dateRange", Label = "Expiry Date", Type = "dateRange" },
                    new() { Key = "search", Label = "Search", Type = "text" },
                },
                RunPreview = (req, restricted, companyId) =>
                    service.GetClientLicenseRegisterPreviewAsync(req, restricted, companyId),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetClientLicenseRegisterExportAsync(req, restricted, companyId, user),
            },
            new()
            {
                Id = "inward-material-movements",
                Title = "Inward Material Movements",
                Category = "Material Movement",
                Description = "Goods received inward: Inward from Vendor and Direct Inward, with line items.",
                Filters = MaterialMovementFilters(includeTypeFilter: false),
                RunPreview = (req, restricted, companyId) =>
                    service.GetMaterialMovementPreviewAsync(
                        req, restricted, companyId, ReportCenterService.InwardMovementTypes),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetMaterialMovementExportAsync(
                        req, restricted, companyId, user,
                        "Inward Material Movements", "Inward_Material_Movements",
                        ReportCenterService.InwardMovementTypes),
            },
            new()
            {
                Id = "outward-material-movements",
                Title = "Outward Material Movements",
                Category = "Material Movement",
                Description = "Goods sent outward: Outward to Vendor and Direct Outward, with line items.",
                Filters = MaterialMovementFilters(includeTypeFilter: false),
                RunPreview = (req, restricted, companyId) =>
                    service.GetMaterialMovementPreviewAsync(
                        req, restricted, companyId, ReportCenterService.OutwardMovementTypes),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetMaterialMovementExportAsync(
                        req, restricted, companyId, user,
                        "Outward Material Movements", "Outward_Material_Movements",
                        ReportCenterService.OutwardMovementTypes),
            },
            new()
            {
                Id = "material-movements",
                Title = "Material Movement Register",
                Category = "Material Movement",
                Description = "All material movements (inward, outward, internal, and temporary) with line items.",
                Filters = MaterialMovementFilters(includeTypeFilter: true),
                RunPreview = (req, restricted, companyId) =>
                    service.GetMaterialMovementPreviewAsync(req, restricted, companyId, null),
                RunExport = (req, restricted, companyId, user) =>
                    service.GetMaterialMovementExportAsync(
                        req, restricted, companyId, user,
                        "Material Movement Register", "Material_Movements",
                        null),
            },
        };
    }

    private static readonly string[] MovementStatusOptions =
    {
        "Draft", "Submitted", "PendingApproval", "Approved", "Dispatched",
        "InTransit", "Received", "Completed", "Rejected", "Cancelled",
        "TemporaryReturnPending", "TemporaryReturned",
    };

    private static readonly string[] MovementTypeOptions =
    {
        "InternalTransfer", "InterEntityTransfer", "OutwardToVendor",
        "InwardFromVendor", "TemporaryMovement", "DirectInward", "DirectOutward",
    };

    private static List<ReportFilterFieldDefinition> MaterialMovementFilters(bool includeTypeFilter)
    {
        var filters = new List<ReportFilterFieldDefinition>
        {
            new() { Key = "companyId", Label = "Entity", Type = "company" },
            new() { Key = "departmentId", Label = "Department", Type = "department" },
            new() { Key = "locationId", Label = "Location", Type = "location" },
            new() { Key = "vendorId", Label = "Vendor", Type = "vendor" },
        };

        if (includeTypeFilter)
        {
            filters.Add(new ReportFilterFieldDefinition
            {
                Key = "movementType",
                Label = "Movement Type",
                Type = "select",
                Options = MovementTypeOptions,
            });
        }

        filters.Add(new ReportFilterFieldDefinition
        {
            Key = "status",
            Label = "Status",
            Type = "status",
            Options = MovementStatusOptions,
        });
        filters.Add(new ReportFilterFieldDefinition
        {
            Key = "dateRange",
            Label = "Requested Date",
            Type = "dateRange",
        });
        filters.Add(new ReportFilterFieldDefinition
        {
            Key = "search",
            Label = "Search",
            Type = "text",
        });

        return filters;
    }
}
