import { SoftwareLicense } from '@/lib/types/domain';

export const softwareLicenses: SoftwareLicense[] = [
  { id: 'lic1', softwareName: 'AutoCAD', vendor: 'Autodesk', licenseType: 'Subscription', totalSeats: 25, seatsUsed: 22, department: 'Architecture', cost: 47500, renewalDate: '2026-08-15', status: 'Active' },
  { id: 'lic2', softwareName: 'Revit', vendor: 'Autodesk', licenseType: 'Subscription', totalSeats: 20, seatsUsed: 19, department: 'BIM Coordination', cost: 52000, renewalDate: '2026-07-30', status: 'Active' },
  { id: 'lic3', softwareName: 'Tekla Structures', vendor: 'Trimble', licenseType: 'Floating', totalSeats: 12, seatsUsed: 8, department: 'Structural Engineering', cost: 38400, renewalDate: '2027-01-10', status: 'Active' },
  { id: 'lic4', softwareName: 'BIM 360', vendor: 'Autodesk', licenseType: 'Subscription', totalSeats: 30, seatsUsed: 25, department: 'BIM Coordination', cost: 21000, renewalDate: '2026-09-01', status: 'Active' },
  { id: 'lic5', softwareName: 'Microsoft Office 365', vendor: 'Microsoft', licenseType: 'Subscription', totalSeats: 120, seatsUsed: 110, department: 'Company-wide', cost: 18000, renewalDate: '2026-12-01', status: 'Active' },
  { id: 'lic6', softwareName: 'ETABS', vendor: 'CSI', licenseType: 'Node-locked', totalSeats: 8, seatsUsed: 6, department: 'Structural Engineering', cost: 15200, renewalDate: '2026-08-05', status: 'Active' },
  { id: 'lic7', softwareName: 'MEP CAD Suite', vendor: 'Trimble', licenseType: 'Floating', totalSeats: 15, seatsUsed: 9, department: 'MEP Design', cost: 22500, renewalDate: '2025-08-01', status: 'Expired' },
  { id: 'lic8', softwareName: 'SketchUp Pro', vendor: 'Trimble', licenseType: 'Perpetual', totalSeats: 10, seatsUsed: 7, department: 'Architecture', cost: 6990, renewalDate: '2027-03-15', status: 'Active' },
];
