using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Vendor;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class VendorController : BaseController
{
    private readonly IVendorService _service;

    public VendorController(IVendorService service)
    {
        _service = service;
    }

    // GET: api/Vendor
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Vendors retrieved successfully.");
    }

    // GET: api/Vendor/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Vendor not found.");

        return Success(
            result,
            "Vendor retrieved successfully.");
    }

    // POST: api/Vendor
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateVendorRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Vendor created successfully.");
    }

    // PUT: api/Vendor/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateVendorRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Vendor not found.");

        return Success(
            result,
            "Vendor updated successfully.");
    }

    // DELETE: api/Vendor/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Vendor not found.");

        return SuccessMessage(
            "Vendor deactivated successfully.");
    }
}
