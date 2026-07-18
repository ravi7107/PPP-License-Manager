import { HardwareAsset } from '@/lib/types/domain';

export const hardwareAssets: HardwareAsset[] = [
  { id: 'hw1', assetTag: 'PPS-WS-1001', type: 'Workstation', model: 'Dell Precision 7960', serialNumber: 'SN-88231A', team: 'Structural Engineering', assignedUser: 'Alex Turner', status: 'Active', purchaseDate: '2023-02-14', warrantyExpiry: '2026-02-14' },
  { id: 'hw2', assetTag: 'PPS-WS-1002', type: 'Workstation', model: 'HP Z8 G5', serialNumber: 'SN-88231B', team: 'MEP Design', assignedUser: 'Rachel Kim', status: 'Active', purchaseDate: '2023-05-20', warrantyExpiry: '2026-05-20' },
  { id: 'hw3', assetTag: 'PPS-LT-2001', type: 'Laptop', model: 'Lenovo ThinkPad P1', serialNumber: 'SN-77120C', team: 'Architecture', assignedUser: 'James Ito', status: 'In Repair', purchaseDate: '2022-11-02', warrantyExpiry: '2025-11-02' },
  { id: 'hw4', assetTag: 'PPS-WS-1003', type: 'Workstation', model: 'Dell Precision 5860', serialNumber: 'SN-99021D', team: 'BIM Coordination', assignedUser: 'Nina Volkov', status: 'Active', purchaseDate: '2024-01-10', warrantyExpiry: '2027-01-10' },
  { id: 'hw5', assetTag: 'PPS-LT-2002', type: 'Laptop', model: 'MacBook Pro 16"', serialNumber: 'SN-55231E', team: 'Structural Engineering', assignedUser: 'Chris Adeyemi', status: 'Retired', purchaseDate: '2020-06-18', warrantyExpiry: '2023-06-18' },
  { id: 'hw6', assetTag: 'PPS-WS-1004', type: 'Workstation', model: 'HP Z6 G5', serialNumber: 'SN-31021F', team: 'MEP Design', assignedUser: 'Laura Bianchi', status: 'Active', purchaseDate: '2023-09-05', warrantyExpiry: '2026-09-05' },
  { id: 'hw7', assetTag: 'PPS-PL-3001', type: 'Plotter', model: 'HP DesignJet T2600', serialNumber: 'SN-40213G', team: 'Architecture', assignedUser: 'Shared Resource', status: 'Active', purchaseDate: '2021-03-22', warrantyExpiry: '2024-03-22' },
  { id: 'hw8', assetTag: 'PPS-WS-1005', type: 'Workstation', model: 'Dell Precision 7960', serialNumber: 'SN-60214H', team: 'BIM Coordination', assignedUser: 'Tom Fischer', status: 'Decommissioned', purchaseDate: '2019-08-14', warrantyExpiry: '2022-08-14' },
];
