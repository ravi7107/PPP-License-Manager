namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

// One row per past PO upload/re-upload (see
// PurchaseRequisitionService.UploadPoByTokenAsync) - the frontend renders
// this as a small collapsible history list wherever the current PoNumber
// shows, so a correction never loses the paper trail of what was on file
// before it. HasPoDocument follows the same convention as
// PurchaseRequisitionResponse.PoDocumentPath being kept internal - the
// frontend calls GET {id}/po-history/{id}/document (authenticated,
// same access rule as the current-PO download) rather than being handed a
// direct URL.
public class PurchaseRequisitionPoUploadResponse
{
    public int Id { get; set; }
    public string? PoNumber { get; set; }
    public DateTime? PoDate { get; set; }
    public decimal? PoAmount { get; set; }
    public bool HasPoDocument { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? UploadedByEmail { get; set; }
}
