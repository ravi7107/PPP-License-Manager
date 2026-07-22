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
        var user = await _userService.CreateAsync(request);
        return Success(user, "User created successfully.");
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest request)
    {
        var user = await _userService.UpdateAsync(id, request);
        return Success(user, "User updated successfully.");
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        int id,
        [FromBody] ResetPasswordRequest request)
    {
        await _userService.ResetPasswordAsync(id, request);

        return Success<object?>(null, "Password reset successfully.");
    }
}
