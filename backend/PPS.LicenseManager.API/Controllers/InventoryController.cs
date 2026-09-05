using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Inventory;
using PPS.LicenseManager.API.Services;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

/*
 * Generic, multi-department inventory register - see InventoryItem's own
 * doc comment. Read actions (list/get/categories/qr/label) are open to
 * any authenticated user, matching how Company/Department/Vendor/Client
 * reads were fixed to be open earlier this engagement (Phase 15) - a
 * Facility/HR user viewing or scanning an inventory item is exactly the
 * intended audience, not just Super Admin/IT Admin. Only Create/Update/
 * Deactivate and category management are admin-restricted, mirroring
 * that same fix's pattern exactly.
 */
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] int? categoryId = null,
        [FromQuery] int? companyId = null,
        [FromQuery] int? locationId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? search = null)
    {
        var result = await _inventoryService.GetPagedAsync(
            page, pageSize, categoryId, companyId, locationId, isActive, search, User);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _inventoryService.GetByIdAsync(id, User);

        if (item == null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Create([FromBody] CreateInventoryItemRequest request)
    {
        try
        {
            var created = await _inventoryService.CreateAsync(request, User);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInventoryItemRequest request)
    {
        try
        {
            var updated = await _inventoryService.UpdateAsync(id, request, User);

            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var success = await _inventoryService.DeactivateAsync(id, User);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _inventoryService.GetCategoriesAsync();
        return Ok(categories);
    }

    [HttpPost("categories")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateInventoryCategoryRequest request)
    {
        try
        {
            var created = await _inventoryService.CreateCategoryAsync(request);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Real, scannable QR (encodes InventoryTag - same idea as
    // AssetQrCodeGenerator's use for AssetTag) for embedding wherever a
    // detail view wants to show it inline.
    [HttpGet("{id:int}/qr")]
    public async Task<IActionResult> GetQr(int id)
    {
        var svg = await _inventoryService.GenerateQrSvgAsync(id, User);

        if (svg == null)
        {
            return NotFound();
        }

        return Content(svg, "image/svg+xml");
    }

    // A printable physical-item label (QR + InventoryTag + identity),
    // generated fresh on every request - never persisted, so it always
    // reflects the item's current fields, exactly mirroring
    // AssetController's GetQrLabel action for Assets.
    [HttpGet("{id:int}/label-pdf")]
    public async Task<IActionResult> GetLabelPdf(int id)
    {
        var item = await _inventoryService.GetByIdAsync(id, User);

        if (item == null)
        {
            return NotFound();
        }

        var pdfBytes = new InventoryQrLabelPdfDocument(item).GeneratePdf();

        return File(pdfBytes, "application/pdf", $"{item.InventoryTag}-label.pdf");
    }

    // A sheet of many labels on one page (2 columns x 5 rows per page),
    // for printing a batch of stickers in one go right after a bulk
    // import or seed - the one genuinely new capability this module
    // adds over Asset's own one-at-a-time label PDF, since tagging
    // dozens of freshly-seeded items one download at a time would be
    // impractical.
    [HttpPost("label-sheet")]
    public async Task<IActionResult> GetLabelSheet([FromBody] List<int> ids)
    {
        if (ids == null || ids.Count == 0)
        {
            return BadRequest(new { message = "At least one item id is required." });
        }

        if (ids.Count > 200)
        {
            return BadRequest(new
            {
                message = "At most 200 labels can be generated in one sheet - narrow the selection.",
            });
        }

        var items = new List<DTOs.Inventory.InventoryItemResponse>();
        foreach (var id in ids.Distinct())
        {
            var item = await _inventoryService.GetByIdAsync(id, User);
            if (item != null)
            {
                items.Add(item);
            }
        }

        if (items.Count == 0)
        {
            return NotFound();
        }

        var pdfBytes = new InventoryQrLabelSheetPdfDocument(items).GeneratePdf();

        return File(pdfBytes, "application/pdf", "inventory-label-sheet.pdf");
    }
}
