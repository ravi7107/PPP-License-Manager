using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.RoleModuleAccess;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// GET is open to any authenticated user (not just Super Admin): every
// logged-in user's AppLayout loads this on every page to shape their OWN
// sidebar/navigation visibility (see frontend/app/layout/app-layout.tsx),
// regardless of their role - it's a read of "what can roles see", not
// sensitive admin data. Only the write path (Upsert) is Super Admin only,
// matching accessManagement's own default entry in
// frontend/lib/auth/roles.ts's MODULE_ACCESS - only the role that already
// sees everything may change what other roles see. This is
// navigation-visibility control, not a backend authorization source - see
// the comment on the RoleModuleAccess model for why the two are
// deliberately kept separate.
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RoleModuleAccessController : BaseController
{
    private readonly IRoleModuleAccessService _service;

    public RoleModuleAccessController(IRoleModuleAccessService service)
    {
        _service = service;
    }

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _service.GetAllAsync();
        return Success(rows, "Role/module access retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Roles = "Super Admin")]
    public async Task<IActionResult> Upsert(
        [FromBody] UpsertRoleModuleAccessRequest request)
    {
        try
        {
            var actorUserId = GetCurrentUserId();

            var row = await _service.UpsertAsync(request, actorUserId);

            return Success(row, "Role/module access updated successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
