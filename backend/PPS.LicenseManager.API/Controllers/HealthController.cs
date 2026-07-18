using Microsoft.AspNetCore.Mvc;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Healthy",
            Application = "PPS License Manager API",
            Version = "1.0.0",
            Time = DateTime.UtcNow
        });
    }
}
