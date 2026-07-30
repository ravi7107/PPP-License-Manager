import {
  createUnavailability,
} from '@/lib/api/availability.api';

interface CreateUnavailabilityParams {
  userId: number | string;
  startDate: string;
  endDate: string;
  reason: string;
  createdByUserId: number;
}

async function createUnavailabilityPeriod(
  params: CreateUnavailabilityParams
) {
  return await createUnavailability({
    userId: Number(params.userId),

    startDate:
      params.startDate.includes('T')
        ? params.startDate
        : `${params.startDate}T00:00:00Z`,

    endDate:
      params.endDate.includes('T')
        ? params.endDate
        : `${params.endDate}T23:59:59Z`,

    reason: params.reason.trim(),

    createdByUserId:
      params.createdByUserId,
  });
}

export default createUnavailabilityPeriod;
