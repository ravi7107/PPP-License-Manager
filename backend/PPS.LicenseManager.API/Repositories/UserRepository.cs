using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.Interfaces.Repositories;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Repositories;

public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    public UserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .Include(u => u.Department)
            .Include(u => u.ReportsToUser)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .Include(u => u.Department)
            .Include(u => u.ReportsToUser)
            .FirstOrDefaultAsync(u => u.Id == id);
    }


public async Task<(List<User> Users, int TotalRecords)> SearchAsync(
    string? search,
    int page,
    int pageSize)
{
    var query = _context.Users
        .Include(u => u.Role)
            .Include(u => u.Company)
            .Include(u => u.Department)
            .Include(u => u.ReportsToUser)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        search = search.Trim();

        query = query.Where(u =>
            u.FullName.Contains(search) ||
            u.Email.Contains(search) ||
            u.EmployeeCode.Contains(search));
    }

    var totalRecords = await query.CountAsync();

    var users = await query
        .OrderBy(u => u.FullName)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return (users, totalRecords);
}
    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
public async Task<List<User>> GetAllAsync()
{
    return await _context.Users
        .Include(u => u.Role)
            .Include(u => u.Company)
            .Include(u => u.Department)
            .Include(u => u.ReportsToUser)
        .OrderBy(u => u.FullName)
        .ToListAsync();
}

public async Task<User?> GetByEmployeeCodeAsync(string employeeCode)
{
    return await _context.Users
        .Include(u => u.Role)
            .Include(u => u.Company)
            .Include(u => u.Department)
            .Include(u => u.ReportsToUser)
        .FirstOrDefaultAsync(u => u.EmployeeCode == employeeCode);
}

public Task UpdateAsync(User user)
{
    _context.Users.Update(user);
    return Task.CompletedTask;
}


}
