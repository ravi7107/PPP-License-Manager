using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);

    Task<User?> GetByIdAsync(int id);

    Task AddAsync(User user);

    Task SaveChangesAsync();
}
