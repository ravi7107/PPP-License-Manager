using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Company;
using PPS.LicenseManager.API.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace PPS.LicenseManager.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CompanyController : BaseController
{
    private readonly ICompanyService _service;

    public CompanyController(ICompanyService service)
    {
        _service = service;
    }

    // GET: api/Company
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(result, "Companies retrieved successfully.");
    }

    // GET: api/Company/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
        return NotFoundResponse("Company not found.");

        return Success(result, "Company retrieved successfully.");
    }

    // POST: api/Company
    [HttpPost]
    public async Task<IActionResult> Create(CreateCompanyRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Company created successfully.");
    }

    // PUT: api/Company/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateCompanyRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
        return NotFoundResponse("Company not found.");

        return Success(result, "Company updated successfully.");
    }

    // DELETE: api/Company/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
        return NotFoundResponse("Company not found.");

        return SuccessMessage("Company deleted successfully.");
    }
}
