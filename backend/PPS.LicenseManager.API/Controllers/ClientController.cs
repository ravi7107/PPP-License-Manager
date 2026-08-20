using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Client;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// "Clients" module - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.clients.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class ClientController : BaseController
{
    private readonly IClientService _service;

    public ClientController(IClientService service)
    {
        _service = service;
    }

    // GET: api/Client
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Clients retrieved successfully.");
    }

    // GET: api/Client/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Client not found.");

        return Success(
            result,
            "Client retrieved successfully.");
    }

    // POST: api/Client
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateClientRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Client created successfully.");
    }

    // PUT: api/Client/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateClientRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Client not found.");

        return Success(
            result,
            "Client updated successfully.");
    }

    // DELETE: api/Client/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Client not found.");

        return SuccessMessage(
            "Client deactivated successfully.");
    }
}
