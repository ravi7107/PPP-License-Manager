using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

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

// Log-only stub until real SMTP/API credentials are provided - see
// LogOnlyEmailService's comment. Swap this one registration for a real
// implementation when they're available; every caller already depends on
// IEmailService, not this class.
builder.Services.AddScoped<IEmailService, LogOnlyEmailService>();

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

app.UseRouting();

// IMPORTANT:
// CORS must run before authentication/authorization.
app.UseCors("ReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
