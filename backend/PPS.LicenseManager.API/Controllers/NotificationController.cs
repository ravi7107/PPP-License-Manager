using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Notification bell - every authenticated user reads/marks only their
// own notifications (INotificationService filters by the caller's own
// UserId throughout, so there is no cross-user access to guard against
// beyond requiring authentication).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _service;

    public NotificationController(INotificationService service)
    {
        _service = service;
    }


    // =========================================================
    // AUTHENTICATED USER
    // =========================================================

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) ||
            !int.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");
        }

        return userId;
    }


    // =========================================================
    // MY NOTIFICATIONS
    // =========================================================

    [HttpGet("my")]
    public async Task<IActionResult> GetMy([FromQuery] int limit = 50)
    {
        var result = await _service.GetMyNotificationsAsync(
            GetCurrentUserId(),
            Math.Clamp(limit, 1, 200));

        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _service.GetUnreadCountAsync(GetCurrentUserId());

        return Ok(new { unreadCount = count });
    }


    // =========================================================
    // MARK READ
    // =========================================================

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var found = await _service.MarkAsReadAsync(id, GetCurrentUserId());

        if (!found)
        {
            return NotFound(new
            {
                message = "Notification not found."
            });
        }

        return Ok(new { success = true });
    }

    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var count = await _service.MarkAllAsReadAsync(GetCurrentUserId());

        return Ok(new { markedCount = count });
    }
}
