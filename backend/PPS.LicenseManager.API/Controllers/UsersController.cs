using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class UsersController : BaseController
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // Both Super Admin and IT Admin pass the controller-level [Authorize]
    // gate above, but a handful of actions below need to tell the two
    // apart - an IT Admin must not be able to grant, modify, or reset the
    // password of a Super Admin account, or change their own role.
    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    private bool IsSuperAdmin()
    {
        return User.IsInRole("Super Admin");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] UserSearchRequest request)
    {
        var users = await _userService.GetAllAsync(request);
        return Success(users, "Users retrieved successfully.");
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _userService.GetByIdAsync(id);

        if (user == null)
        {
            return NotFound(new
            {
                Success = false,
                Message = "User not found."
            });
        }

        return Success(user, "User retrieved successfully.");
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        try
        {
            var user = await _userService.CreateAsync(request, IsSuperAdmin());
            return Success(user, "User created successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var user = await _userService.UpdateAsync(
                id, request, currentUserId, IsSuperAdmin());

            return Success(user, "User updated successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        int id,
        [FromBody] ResetPasswordRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            await _userService.ResetPasswordAsync(
                id, request, currentUserId, IsSuperAdmin());

            return Success<object?>(null, "Password reset successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }
}
