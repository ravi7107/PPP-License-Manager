using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Utilization;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Admin-configurable usage-tier thresholds - same "get-or-create a single
 * settings row" shape as PurchaseRequisitionSettingsService. Editing
 * thresholds never rewrites a stored UtilizationFact; the analysis
 * engine (UtilizationAnalysisService) reads the applicable row at query
 * time, which is what keeps tiering "configurable, not hardcoded"
 * without mixing raw and calculated data.
 */
public class UtilizationTierSettingsService : IUtilizationTierSettingsService
{
    private readonly ApplicationDbContext _context;

    public UtilizationTierSettingsService(ApplicationDbContext context)
    {
        _context = context;
    }

    private async Task<UtilizationTierSettings> GetOrCreateRowAsync(int? companyId)
    {
        var row = await _context.UtilizationTierSettings
            .Include(s => s.UpdatedByUser)
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        if (row != null) return row;

        row = new UtilizationTierSettings { CompanyId = companyId };
        _context.UtilizationTierSettings.Add(row);
        await _context.SaveChangesAsync();

        return row;
    }

    public async Task<UtilizationTierSettingsResponse> GetAsync(int? companyId)
    {
        var row = await GetOrCreateRowAsync(companyId);
        return Map(row);
    }

    public async Task<UtilizationTierSettingsResponse> UpdateAsync(
        UpdateUtilizationTierSettingsRequest request, int actorUserId)
    {
        if (request.HeavyMinPct <= request.RegularMinPct ||
            request.RegularMinPct <= request.OccasionalMinPct ||
            request.OccasionalMinPct <= request.LowMinPct ||
            request.LowMinPct < 0)
            throw new InvalidOperationException(
                "Thresholds must be in strictly descending order (Heavy > Regular > Occasional > Low >= 0).");

        var row = await GetOrCreateRowAsync(request.CompanyId);

        row.HeavyMinPct = request.HeavyMinPct;
        row.RegularMinPct = request.RegularMinPct;
        row.OccasionalMinPct = request.OccasionalMinPct;
        row.LowMinPct = request.LowMinPct;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedByUserId = actorUserId;

        await _context.SaveChangesAsync();

        await _context.Entry(row).Reference(x => x.UpdatedByUser).LoadAsync();

        return Map(row);
    }

    private static UtilizationTierSettingsResponse Map(UtilizationTierSettings s)
    {
        return new UtilizationTierSettingsResponse
        {
            CompanyId = s.CompanyId,
            HeavyMinPct = s.HeavyMinPct,
            RegularMinPct = s.RegularMinPct,
            OccasionalMinPct = s.OccasionalMinPct,
            LowMinPct = s.LowMinPct,
            UpdatedAt = s.UpdatedAt,
            UpdatedByUserName = s.UpdatedByUser?.FullName,
        };
    }
}
