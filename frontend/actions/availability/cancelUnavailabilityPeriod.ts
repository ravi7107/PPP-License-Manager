import {
  cancelUnavailability,
} from '@/lib/api/availability.api';

interface CancelUnavailabilityParams {
  id: number;
  cancelledByUserId: number;
}

async function cancelUnavailabilityPeriod(
  params: CancelUnavailabilityParams
) {
  await cancelUnavailability(
    params.id,
    {
      cancelledByUserId:
        params.cancelledByUserId,
    }
  );

  return true;
}

export default cancelUnavailabilityPeriod;
