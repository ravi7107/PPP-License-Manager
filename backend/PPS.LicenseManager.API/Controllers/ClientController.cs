using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Client;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[Authorize]
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
    //
    // Reads stay open to any authenticated user - client names are read
    // as a lookup/filter by pages outside the Clients admin module itself
    // (Licenses, and a request-loading helper), across roles well beyond
    // Super Admin/IT Admin. Restricting this class-wide (as it briefly
    // was) broke every one of those pages for any other role. Only
    // Create/Update/Delete below are restricted to the Clients module's
    // own audience (frontend/lib/auth/roles.ts MODULE_ACCESS.clients) -
    // matching the pattern already used correctly by
    // AssetController/ResourceAllocationController.
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
