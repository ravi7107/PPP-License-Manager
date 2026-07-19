using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
}
