import {
  getUnavailabilities,
  type UserUnavailabilityApi,
} from '@/lib/api/availability.api';

function getEffectiveStatus(
  record: UserUnavailabilityApi
): 'Active' | 'Cancelled' | 'Ended' | 'Upcoming' {
  if (record.status.toLowerCase() === 'cancelled') {
    return 'Cancelled';
  }

  const now = new Date();
  const start = new Date(record.startDate);
  const end = new Date(record.endDate);

  if (now < start) {
    return 'Upcoming';
  }

  if (now > end) {
    return 'Ended';
  }

  return 'Active';
}

async function loadUnavailabilityPeriods() {
  const records = await getUnavailabilities();

  return records.map((record) => ({
    id: record.id,
    user_id: record.userId,
    user_name: record.userName,

    department_id: null,
    department_name: null,

    start_date: record.startDate,
    end_date: record.endDate,
    reason: record.reason,

    status: record.status,
    effective_status: getEffectiveStatus(record),

    created_at: record.createdAt,
    updated_at: record.cancelledAt ?? record.createdAt,

    created_by: record.createdBy ?? null,
    updated_by: record.cancelledBy ?? record.createdBy ?? null,
  }));
}

export default loadUnavailabilityPeriods;
