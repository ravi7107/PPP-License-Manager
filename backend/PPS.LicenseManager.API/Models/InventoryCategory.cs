namespace PPS.LicenseManager.API.Models;

/*
 * A small, admin-extensible taxonomy for what kind of inventory an item
 * is - "IT Equipment", "Facility", "HR", "Vehicle", "Other", etc. This is
 * what actually answers "IT inventory vs Facility inventory vs HR
 * inventory" in this app - NOT Department, which (per the business
 * owner) records an employee's role/designation, not an organizational
 * unit, and NOT Company, which is the sub-company ("Entity") an item
 * belongs to, not what kind of item it is.
 *
 * Deliberately a separate table from MaterialItemCategory (the Material
 * Movement module's own item-type catalog), even though the shape looks
 * similar - MaterialItemCategory is tightly coupled to the live Material
 * Movement approval workflow, and reusing it here would risk that
 * workflow's behavior every time this module's taxonomy changes. Seeded
 * with a starting set (IT Equipment/Facility/HR/Other); an admin can add
 * more later the same way Vendor/Department rows are already managed.
 */
public class InventoryCategory
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
