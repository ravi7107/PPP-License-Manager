using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Vendor;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Repositories.Interfaces;

namespace PPS.LicenseManager.API.Repositories;

public class VendorRepository : IVendorRepository
{
    private readonly ApplicationDbContext _context;

    public VendorRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Vendor>> GetAllAsync()
    {
        return await _context.Vendors
            .OrderBy(v => v.VendorName)
            .ToListAsync();
    }

    public async Task<Vendor?> GetByIdAsync(int id)
    {
        return await _context.Vendors.FindAsync(id);
    }

    public async Task<Vendor?> GetByCodeAsync(string vendorCode)
    {
        return await _context.Vendors
            .FirstOrDefaultAsync(v => v.VendorCode == vendorCode);
    }

    public async Task<PagedResponse<Vendor>> SearchAsync(VendorSearchRequest request)
    {
        var query = _context.Vendors.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            query = query.Where(v =>
                v.VendorName.Contains(request.Search) ||
                v.VendorCode.Contains(request.Search));
        }

        var totalRecords = await query.CountAsync();

        var data = await query
            .OrderBy(v => v.VendorName)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagedResponse<Vendor>
        {
            Items = data,
            TotalRecords = totalRecords,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    public async Task AddAsync(Vendor vendor)
    {
        await _context.Vendors.AddAsync(vendor);
    }

    public Task UpdateAsync(Vendor vendor)
    {
        _context.Vendors.Update(vendor);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
