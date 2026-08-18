namespace PPS.LicenseManager.API.Services;

/*
 * Single source of truth for "who actually is/was the approver" on a
 * PurchaseRequisitionApprovalStep - a step is decided by EITHER a system
 * User OR a standalone PurchaseRequisitionContact (external, no login),
 * never both (see PurchaseRequisitionApprovalStep's model comment).
 *
 * Both PurchaseRequisitionService.Map (the API response) and
 * PurchaseRequisitionPdfDocument (the generated PDF) need to resolve this
 * the same way. Previously the PDF class did its own thing
 * (step.AssignedApproverUser?.FullName ?? "-"), which meant a
 * Contact-decided step always rendered "-" as the approver on the PDF
 * even though a real, named approver existed and decided it - the API
 * response already resolved this correctly via ApproverType. Routing both
 * callers through this one helper is what fixes that PDF bug, and keeps
 * it from coming back if either caller is touched again in isolation.
 */
public static class PurchaseRequisitionApproverDisplay
{
    public readonly record struct Info(
        string Name,
        string? Email,
        string ApproverType,
        string? EmployeeCode);

    public static Info Resolve(Models.PurchaseRequisitionApprovalStep step)
    {
        if (step.AssignedApproverContactId.HasValue)
        {
            // Contacts have no login and therefore no EmployeeCode - this
            // is the one case the spec's "never fabricate an Employee ID"
            // instruction actually applies to.
            return new Info(
                Name: step.AssignedApproverContact?.FullName ?? string.Empty,
                Email: step.AssignedApproverContact?.Email,
                ApproverType: "Contact",
                EmployeeCode: null);
        }

        return new Info(
            Name: step.AssignedApproverUser?.FullName ?? string.Empty,
            Email: step.AssignedApproverUser?.Email,
            ApproverType: "User",
            EmployeeCode: step.AssignedApproverUser?.EmployeeCode);
    }
}
