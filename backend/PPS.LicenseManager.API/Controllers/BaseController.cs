using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{

protected IActionResult NotFoundResponse(string message = "Resource not found.")
{
    return NotFound(new ApiResponse<object>
    {
        Success = false,
        Message = message,
        Data = null
    });
}

protected IActionResult BadRequestResponse(string message)
{
    return BadRequest(new ApiResponse<object>
    {
        Success = false,
        Message = message,
        Data = null
    });
}
    protected IActionResult Success<T>(T data, string message = "Success")
    {
        return Ok(new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        });
    }

    protected IActionResult CreatedResponse<T>(
        string actionName,
        object routeValues,
        T data,
        string message = "Created successfully")
    {
        return CreatedAtAction(
            actionName,
            routeValues,
            new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data
            });
    }

    protected IActionResult SuccessMessage(string message)
    {
        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = message,
            Data = null
        });
    }
}
