import { Allocation } from '@/lib/types/domain';

export const allocations: Allocation[] = [
  { id: 'al1', licenseId: 'lic1', softwareName: 'AutoCAD', assignedUser: 'James Ito', team: 'Architecture', allocationDate: '2025-01-10', status: 'Active' },
  { id: 'al2', licenseId: 'lic2', softwareName: 'Revit', assignedUser: 'Nina Volkov', team: 'BIM Coordination', allocationDate: '2025-02-05', status: 'Active' },
  { id: 'al3', licenseId: 'lic3', softwareName: 'Tekla Structures', assignedUser: 'Alex Turner', team: 'Structural Engineering', allocationDate: '2025-03-12', status: 'Temporarily Shared', shareEndDate: '2026-07-25' },
  { id: 'al4', licenseId: 'lic4', softwareName: 'BIM 360', assignedUser: 'Tom Fischer', team: 'BIM Coordination', allocationDate: '2025-04-01', status: 'Active' },
  { id: 'al5', licenseId: 'lic6', softwareName: 'ETABS', assignedUser: 'Chris Adeyemi', team: 'Structural Engineering', allocationDate: '2025-05-18', status: 'Pending Return', shareEndDate: '2026-07-10' },
  { id: 'al6', licenseId: 'lic5', softwareName: 'Microsoft Office 365', assignedUser: 'Rachel Kim', team: 'MEP Design', allocationDate: '2025-01-22', status: 'Active' },
];
