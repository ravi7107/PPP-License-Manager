using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class PurchaseRequisitionSettingsService : IPurchaseRequisitionSettingsService
{
    private readonly ApplicationDbContext _context;

    public PurchaseRequisitionSettingsService(ApplicationDbContext context)
    {
        _context = context;
    }

    // There is deliberately only ever one row in this table - find it, or
    // create it on first use. Not wrapped in extra locking: a rare
    // concurrent double-insert on the very first call is a harmless,
    // recoverable edge case (not a correctness issue - both rows would
    // hold the same "unset" default), not worth the complexity of a
    // singleton constraint for a table this small.
    private async Task<PurchaseRequisitionSettings> GetOrCreateRowAsync()
    {
        var row = await _context.PurchaseRequisitionSettings
            .Include(s => s.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (row != null)
            return row;

        row = new PurchaseRequisitionSettings
        {
            FinanceNotificationEmail = null,
            UpdatedAt = DateTime.UtcNow,
            UpdatedByUserId = null
        };

        _context.PurchaseRequisitionSettings.Add(row);

        await _context.SaveChangesAsync();

        return row;
    }

    private static PurchaseRequisitionSettingsResponse Map(PurchaseRequisitionSettings s)
    {
        return new PurchaseRequisitionSettingsResponse
        {
            FinanceNotificationEmail = s.FinanceNotificationEmail,
            UpdatedAt = s.UpdatedAt,
            UpdatedByUserName = s.UpdatedByUser?.FullName
        };
    }

    public async Task<PurchaseRequisitionSettingsResponse> GetAsync()
    {
        var row = await GetOrCreateRowAsync();

        return Map(row);
    }

    public async Task<PurchaseRequisitionSettingsResponse> UpdateAsync(
        UpdatePurchaseRequisitionSettingsRequest request,
        int updatedByUserId)
    {
        var row = await GetOrCreateRowAsync();

        row.FinanceNotificationEmail =
            string.IsNullOrWhiteSpace(request.FinanceNotificationEmail)
                ? null
                : request.FinanceNotificationEmail.Trim();
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedByUserId = updatedByUserId;

        await _context.SaveChangesAsync();

        // Reload with the nav included so the response reflects the new
        // UpdatedByUser's name.
        await _context.Entry(row).Reference(r => r.UpdatedByUser).LoadAsync();

        return Map(row);
    }
}
