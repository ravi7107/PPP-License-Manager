export type UnavailabilityStatus = 'Active' | 'Cancelled' | 'Ended' | 'Upcoming';
export type ResourceType = 'Asset' | 'License';
export type ReallocationStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Returned';

export interface UnavailabilityPeriod {
  id: number;
  user_id: number;
  user_name: string;
  department_id: number | null;
  department_name: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  status: UnavailabilityStatus;
  effective_status: UnavailabilityStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AvailableResource {
  unavailability_id: number;
  user_id: number;
  user_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  resource_type: ResourceType;
  asset_id: number | null;
  resource_label: string;
  resource_subtype: string | null;
  license_allocation_id: number | null;
  resulting_allocation_id: number | null;
  software_name: string | null;
  pending_request_id: number | null;
  request_status: ReallocationStatus | null;
}

export type ReallocationReason = 'Unavailability' | 'Underutilization';

export interface ReallocationRequest {
  id: number;
  // Null when reallocation_reason is "Underutilization" - that path
  // isn't tied to any unavailability period.
  unavailability_id: number | null;
  // "Unavailability" (temporary, return-by-date) or "Underutilization"
  // (permanent, manual, justified by `justification`).
  reallocation_reason: ReallocationReason;
  source_user_id: number;
  source_user_name: string;
  resource_type: ResourceType;
  asset_id: number | null;
  asset_tag: string | null;
  license_allocation_id: number | null;
  resulting_allocation_id: number | null;
  resulting_allocation_active: boolean | null;
  software_name: string | null;
  target_user_id: number | null;
  target_user_name: string | null;
  requested_by: string | null;
  justification: string | null;
  status: ReallocationStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;


  returned_at: string | null;
  returned_by_user_id: number | null;
  returned_by: string | null;
  return_remarks: string | null;
  return_allocation_id: number | null;

  created_at: string;
}

export interface LookupOption {
  id: number;
  name: string;
}

export interface UnavailabilityFormValues {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export const EMPTY_UNAVAILABILITY_FORM: UnavailabilityFormValues = {
  userId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  reason: '',
};

export interface ReallocationFormValues {
  targetUserId: string;
  justification: string;
}

export const EMPTY_REALLOCATION_FORM: ReallocationFormValues = {
  targetUserId: '',
  justification: '',
};

// A currently active license allocation, offered as a candidate to flag
// as underutilized and reallocate to someone else.
export interface UnderutilizedCandidate {
  resource_allocation_id: number;
  license_id: number;
  license_alias_code: string;
  software_name: string;
  current_user_id: number;
  current_user_name: string;
  asset_name: string | null;
}

export interface UnderutilizedReallocationFormValues {
  resourceAllocationId: string;
  targetUserId: string;
  justification: string;
}

export const EMPTY_UNDERUTILIZED_REALLOCATION_FORM: UnderutilizedReallocationFormValues = {
  resourceAllocationId: '',
  targetUserId: '',
  justification: '',
};
