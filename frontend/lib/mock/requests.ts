import { LicenseRequest } from '@/lib/types/domain';

export const licenseRequests: LicenseRequest[] = [
  { id: 'req1', requestType: 'New License', requester: 'Sarah Johnson', team: 'Structural Engineering', softwareName: 'ETABS', justification: 'New hire needs analysis seat', requestedDate: '2026-07-14', status: 'Pending' },
  { id: 'req2', requestType: 'Temporary Release', requester: 'Michael Chen', team: 'MEP Design', softwareName: 'MEP CAD Suite', justification: 'Team member on leave for 3 weeks', requestedDate: '2026-07-12', durationDays: 21, status: 'Pending' },
  { id: 'req3', requestType: 'New License', requester: 'Priya Patel', team: 'Architecture', softwareName: 'SketchUp Pro', justification: 'Additional concept design seat needed', requestedDate: '2026-07-05', status: 'Approved', comment: 'Approved, seat allocated.' },
  { id: 'req4', requestType: 'Temporary Release', requester: 'David Okafor', team: 'BIM Coordination', softwareName: 'Revit', justification: 'Short-term project pause', requestedDate: '2026-06-28', durationDays: 14, status: 'Rejected', comment: 'Seat still required by team.' },
];
