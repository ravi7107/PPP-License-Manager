namespace PPS.LicenseManager.API.DTOs.ResourceAllocation
{
    public class ResourceAllocationResponse
    {
        public int Id { get; set; }

        public Guid AllocationReference { get; set; }

        public int LicenseId { get; set; }

        public string LicenseAliasCode { get; set; } = string.Empty;

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public int? AssetId { get; set; }

        public string? AssetName { get; set; }

        public int AllocatedByUserId { get; set; }

        public string AllocatedBy { get; set; } = string.Empty;

        public DateTime AllocatedOn { get; set; }

        public DateTime? ExpectedReturnDate { get; set; }

        public DateTime? ActualReturnDate { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
