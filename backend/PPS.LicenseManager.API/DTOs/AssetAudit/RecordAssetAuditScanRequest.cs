using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAudit;

public class RecordAssetAuditScanRequest
{
    // The parsed identifier from the scanned QR/barcode - an AssetTag
    // (checked first) or SerialNumber, exactly like AssetController's
    // GET by-code/{code}. The mobile app never sends an asset id
    // directly from a scan, only what the code actually contained -
    // resolution to a real asset happens server-side.
    [Required]
    public string Code { get; set; } = string.Empty;
}
