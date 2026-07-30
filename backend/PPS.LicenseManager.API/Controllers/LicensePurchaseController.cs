using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.LicensePurchase;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LicensePurchaseController : ControllerBase
{
    private readonly ILicensePurchaseService _licensePurchaseService;

    public LicensePurchaseController(
        ILicensePurchaseService licensePurchaseService)
    {
        _licensePurchaseService = licensePurchaseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var purchases =
            await _licensePurchaseService.GetAllAsync();

        return Ok(purchases);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var purchase =
            await _licensePurchaseService.GetByIdAsync(id);

        if (purchase == null)
            return NotFound();

        return Ok(purchase);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateLicensePurchaseRequest request)
    {
        var purchase =
            await _licensePurchaseService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = purchase.Id },
            purchase);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateLicensePurchaseRequest request)
    {
        var updated =
            await _licensePurchaseService.UpdateAsync(id, request);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted =
            await _licensePurchaseService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
