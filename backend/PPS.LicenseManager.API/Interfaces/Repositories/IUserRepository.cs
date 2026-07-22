using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);

    Task<User?> GetByEmployeeCodeAsync(string employeeCode);

    Task<User?> GetByIdAsync(int id);

    Task<List<User>> GetAllAsync();

    Task<(List<User> Users, int TotalRecords)> SearchAsync(
        string? search,
        int page,
        int pageSize);

    Task AddAsync(User user);

    Task UpdateAsync(User user);

    Task SaveChangesAsync();
}
