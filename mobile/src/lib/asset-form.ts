import { z } from 'zod';
import { CreateAssetRequest } from '@/types/api';

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
  };
}
