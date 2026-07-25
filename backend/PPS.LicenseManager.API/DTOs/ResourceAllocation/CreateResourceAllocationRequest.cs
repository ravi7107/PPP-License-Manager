using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.ResourceAllocation
{
    public class CreateResourceAllocationRequest
    {
        [Required]
        public int LicenseId { get; set; }

        [Required]
        public int UserId { get; set; }

        public int? AssetId { get; set; }

        [Required]
        public int AllocatedByUserId { get; set; }

        public DateTime? ExpectedReturnDate { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }
}
