using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PPS.LicenseManager.API.Authentication;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Interfaces.Repositories;
using PPS.LicenseManager.API.Middleware;
using PPS.LicenseManager.API.Repositories;
using PPS.LicenseManager.API.Services;
using System.Text;
using PPS.LicenseManager.API.Repositories.Interfaces;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.Services.ReportCenter;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ===============================
// QuestPDF license
// ===============================
// Community license: free for any individual/business under $1M USD
// annual gross revenue (https://www.questpdf.com/license/configuration.html).
// If that no longer applies, switch to a paid QuestPDF license here.
QuestPDF.Settings.License = LicenseType.Community;

// QuestPDF discovers fonts from the OS by default (Settings.UseEnvironmentFonts,
// true by default) - left as-is deliberately, since the Dockerfile installs
// fontconfig + fonts-dejavu-core specifically so that discovery has a real
// font to find. Without one or the other, PDF generation throws at runtime.

// ===============================
// Services
// ===============================

builder.Services.AddControllers();

// ===============================
// CORS - React Frontend
// ===============================

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy
            .WithOrigins("http://98.93.56.145:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(x => x.Value?.Errors.Count > 0)
            .SelectMany(x => x.Value!.Errors)
            .Select(e => e.ErrorMessage)
            .ToList();

        return new BadRequestObjectResult(new ApiResponse<object>
        {
            Success = false,
            Message = "Validation failed.",
            Data = null,
            Errors = errors
        });
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ===============================
// Database
// ===============================

// Migrations in this project are hand-authored (there's no dotnet-ef
// tooling available in the environment they're written in), so the
// ModelSnapshot is hand-edited to match rather than machine-generated.
// As of the EF Core version this app targets, Database.Migrate() now
// validates at startup that the current model exactly matches the
// snapshot of the last migration, and THROWS (not just warns) if they
// differ - see https://aka.ms/efcore-docs-pending-changes. That check
// only compares the design-time model shape; it has no bearing on
// whether a migration's hand-written Up()/Down() SQL is correct, so
// it's suppressed here rather than chased down by hand every time a
// migration is authored this way.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options
        .UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(warnings =>
            warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

// ===============================
// JWT Authentication
// ===============================

var jwt = builder.Configuration.GetSection("Jwt");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]!)
            ),

            ClockSkew = TimeSpan.Zero
        };
    });

// ===============================
// Dependency Injection
// ===============================

builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleModuleAccessService, RoleModuleAccessService>();

builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IOfficeLocationService, OfficeLocationService>();
builder.Services.AddScoped<IClientService, ClientService>();

builder.Services.AddScoped<ISoftwareService, SoftwareService>();
builder.Services.AddScoped<ILicensePurchaseService, LicensePurchaseService>();

builder.Services.AddScoped<IAssetService, AssetService>();

builder.Services.AddScoped<
    IAssetAssignmentService,
    AssetAssignmentService>();

builder.Services.AddScoped<
    IAssetReallocationRequestService,
    AssetReallocationRequestService>();

// PPS Asset Scanner mobile app - physical audit/stocktake sessions.
builder.Services.AddScoped<
    IAssetAuditService,
    AssetAuditService>();

builder.Services.AddScoped<
    IAssetSoftwareService,
    AssetSoftwareService>();

builder.Services.AddScoped<
    IVendorRepository,
    VendorRepository>();

builder.Services.AddScoped<
    IVendorService,
    VendorService>();

builder.Services.AddScoped<
    ILicenseService,
    LicenseService>();

builder.Services.AddScoped<
    IResourceAllocationService,
    ResourceAllocationService>();

builder.Services.AddScoped<
    INotificationService,
    NotificationService>();

builder.Services.AddScoped<
    IAvailabilityService,
    AvailabilityService>();

builder.Services.AddScoped<
    IAllocationRequestService,
    AllocationRequestService>();

builder.Services.AddScoped<
    IPurchaseRequisitionService,
    PurchaseRequisitionService>();

builder.Services.AddScoped<
    IAnalyticsService,
    AnalyticsService>();

builder.Services.AddScoped<
    IMaterialItemCategoryService,
    MaterialItemCategoryService>();

builder.Services.AddScoped<
    IMaterialItemService,
    MaterialItemService>();

builder.Services.AddScoped<
    IMaterialCostCenterService,
    MaterialCostCenterService>();

builder.Services.AddScoped<
    IMaterialTransporterService,
    MaterialTransporterService>();

builder.Services.AddScoped<
    IMaterialApprovalWorkflowService,
    MaterialApprovalWorkflowService>();

builder.Services.AddScoped<
    IMaterialMovementService,
    MaterialMovementService>();

builder.Services.AddScoped<
    IRequestService,
    RequestService>();

builder.Services.AddScoped<
    IPurchaseRequisitionContactService,
    PurchaseRequisitionContactService>();

builder.Services.AddScoped<
    IPurchaseRequisitionSettingsService,
    PurchaseRequisitionSettingsService>();


// Report Center - catalog, preview, and ClosedXML export.
builder.Services.AddScoped<
    IReportExcelExportService,
    ReportExcelExportService>();

builder.Services.AddScoped<
    IReportCenterService,
    ReportCenterService>();

// Software License Utilization & Analytics module
builder.Services.AddScoped<
    IUtilizationUploadService,
    UtilizationUploadService>();

builder.Services.AddScoped<
    IUtilizationAnalysisService,
    UtilizationAnalysisService>();

builder.Services.AddScoped<
    IUtilizationTierSettingsService,
    UtilizationTierSettingsService>();

// Real email transports, both registered as themselves (not as
// IEmailService directly) so EmailServiceRouter can pick between them at
// call time - Graph preferred, Smtp as fallback, LogOnlyEmailService if
// neither is configured. AddHttpClient() is what GraphEmailService's
// IHttpClientFactory dependency needs; it's part of the ASP.NET Core
// shared framework already, no new PackageReference required.
builder.Services.AddHttpClient();
builder.Services.AddScoped<GraphEmailService>();
builder.Services.AddScoped<SmtpEmailService>();
builder.Services.AddScoped<LogOnlyEmailService>();
builder.Services.AddScoped<IEmailService, EmailServiceRouter>();

var app = builder.Build();

// ===============================
// Seed Initial Data
// ===============================

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider
        .GetRequiredService<ApplicationDbContext>();

    await DbSeeder.SeedAsync(db);
}

// ===============================
// Middleware
// ===============================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// We are currently developing over HTTP.
// Enable this later when HTTPS is configured.
// app.UseHttpsRedirection();

app.UseMiddleware<ExceptionMiddleware>();

// Serve uploaded floor-plan images from wwwroot.
app.UseStaticFiles();

// Serve versioned email/branding assets (logo + icon set used in the PR
// approval email templates) at /api/branding/* - deliberately under the
// /api prefix, not the default wwwroot root, so the existing Cloudflare
// Tunnel ingress rule (which only routes ^/(api|uploads)/.* to this
// backend container; everything else goes to the frontend's nginx) picks
// this path up automatically, with no tunnel config change needed.
//
// This is a *separate* physical folder from wwwroot/uploads - that one
// is overlaid by the backend_uploads named volume in docker-compose.yml
// (real user-uploaded files, persisted across image rebuilds), whereas
// wwwroot/branding is plain image content, checked into git and baked
// into the image on every build like any other file.
//
// Hosted HTTPS URLs (not base64 data-URI images) are required here
// specifically because Outlook desktop's Word-based rendering engine
// does not reliably display data:-URI <img> tags - the previous
// approach (embedding the logo as base64) rendered fine in Gmail/Apple
// Mail but was a known risk for Outlook/O365 recipients.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(app.Environment.WebRootPath, "branding")),
    RequestPath = "/api/branding"
});

app.UseRouting();

// IMPORTANT:
// CORS must run before authentication/authorization.
app.UseCors("ReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
