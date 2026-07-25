using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.ResourceAllocation
{
    public class UpdateResourceAllocationRequest
    {
        [Required]
        public int UserId { get; set; }

        public int? AssetId { get; set; }

        public DateTime? ExpectedReturnDate { get; set; }

        public DateTime? ActualReturnDate { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Allocated";

        [MaxLength(500)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; }
    }
}
