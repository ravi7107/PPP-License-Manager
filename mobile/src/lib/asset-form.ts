import { z } from 'zod';
import { CreateAssetRequest, PurchaseRequisitionAvailableLineResponse } from '@/types/api';

// Extension 4, Phase 22 - "Owned" (default) or "Rented", matching
// Asset.OwnershipType's own values exactly (Models/Asset.cs).
export const OWNERSHIP_TYPES = ['Owned', 'Rented'] as const;
export type OwnershipTypeOption = (typeof OWNERSHIP_TYPES)[number];

// Simple YYYY-MM-DD text validation rather than a native date picker -
// this app has no date-picker dependency today (expo-datetimepicker or
// similar isn't installed), and adding one is a bigger, separately-
// testable change than this phase's actual ask. Optional either way -
// the backend fields (RentalStartDate/RentalEndDate) are nullable.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const optionalDateString = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || DATE_PATTERN.test(v), 'Use YYYY-MM-DD.');

// Fixed set the web app's own Asset form uses (frontend/app/pages/
// hardware/components/asset-form-dialog.tsx's assetFormSchema) - kept
// as a literal union here rather than fetched from the backend, since
// the backend has no "asset types" lookup endpoint; the web app hard-
// codes the same list for the same reason.
export const ASSET_TYPES = ['Desktop', 'Laptop', 'Workstation', 'Server'] as const;
export type AssetTypeOption = (typeof ASSET_TYPES)[number];

// Deliberately narrower than the web app's full Asset form (which also
// covers HostName, Processor, RAM/Storage, GPU, OS, purchase/warranty
// dates): this screen exists so field staff can log a newly-arrived
// asset in under a minute, not replace the desktop Asset Management
// screen. Anything left off here can still be filled in later there -
// see mobile/README.md's "Add Asset" section.
export const newAssetSchema = z.object({
  assetTag: z
    .string()
    .trim()
    .min(1, 'Asset Tag is required.')
    .max(50, 'Asset Tag must be 50 characters or fewer.'),
  assetName: z.string().trim().min(1, 'Asset Name is required.'),
  // Default value in the form is always one of ASSET_TYPES (selected via
  // fixed pill buttons, never free text), so this branch is effectively
  // unreachable in the UI - kept as a real validation rule rather than
  // an assumption, in case that ever changes.
  assetType: z.enum(ASSET_TYPES),
  departmentId: z
    .number({
      required_error: 'Select a department.',
      invalid_type_error: 'Select a department.',
    })
    .int()
    .positive('Select a department.'),
  manufacturer: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  remarks: z.string().trim().optional(),

  // Extension 4, Phase 22 - "Link to Purchase Requisition" section.
  // purchaseRequisitionLineItemId is the only one of these four actually
  // sent to the backend; prNumber/prItemDescription are display-only (so
  // the linked chip can show something readable without a second fetch)
  // and never validated as required, since linking stays fully optional.
  purchaseRequisitionLineItemId: z.number().int().positive().optional(),
  prNumber: z.string().optional(),
  prItemDescription: z.string().optional(),

  // "Ownership" section - Owned is the default and requires nothing
  // else; Rented's Vendor/dates stay optional even then (the backend
  // enforces nothing beyond nullability here - see
  // DTOs/Asset/CreateAssetRequest.cs - so this form doesn't invent a
  // stricter rule the server doesn't itself have).
  ownershipType: z.enum(OWNERSHIP_TYPES).default('Owned'),
  vendorId: z.number().int().positive().optional(),
  rentalStartDate: optionalDateString,
  rentalEndDate: optionalDateString,
});

export type NewAssetFormValues = z.infer<typeof newAssetSchema>;

// Blank optional strings are sent as undefined rather than "" - keeps
// the create payload matching how the web app's own form behaves
// (empty text fields never overwrite a DTO's optional string with "").
export function toCreateAssetRequest(
  values: NewAssetFormValues
): CreateAssetRequest {
  const clean = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

  return {
    assetTag: values.assetTag,
    assetName: values.assetName,
    assetType: values.assetType,
    departmentId: values.departmentId,
    manufacturer: clean(values.manufacturer),
    model: clean(values.model),
    serialNumber: clean(values.serialNumber),
    remarks: clean(values.remarks),
    purchaseRequisitionLineItemId: values.purchaseRequisitionLineItemId ?? undefined,
    // Owned is the backend's own default too (OwnershipType defaults to
    // "Owned" when blank - AssetService.CreateAsync) - sent explicitly
    // anyway so the payload is unambiguous either way.
    ownershipType: values.ownershipType,
    vendorId: values.ownershipType === 'Rented' ? values.vendorId ?? undefined : undefined,
    rentalStartDate:
      values.ownershipType === 'Rented' ? clean(values.rentalStartDate) : undefined,
    rentalEndDate:
      values.ownershipType === 'Rented' ? clean(values.rentalEndDate) : undefined,
  };
}

// Applies a picked/scanned PR line (see app/(app)/asset/scan-pr.tsx and
// src/lib/pending-pr-link.ts) onto the form's three PR-link fields in
// one place, so the "apply" logic lives next to the schema it targets
// rather than being reimplemented inline in the screen.
export function prLineToFormFields(
  line: PurchaseRequisitionAvailableLineResponse
): Pick<
  NewAssetFormValues,
  'purchaseRequisitionLineItemId' | 'prNumber' | 'prItemDescription'
> {
  return {
    purchaseRequisitionLineItemId: line.lineItemId,
    prNumber: line.prNumber,
    prItemDescription: line.itemDescription,
  };
}
