import api from './client';

export interface InvestmentSummaryApi {
  totalInvestment: number;
  totalSeats: number;
  usedSeats: number;
  utilizationPct: number;
  unusedCost: number;
  activeSoftwareCount: number;
  renewals30d: number;
  renewals90d: number;
}

export interface TopExpensiveSoftwareApi {
  softwareName: string;
  vendor: string | null;
  totalCost: number;
  totalSeats: number;
  usedSeats: number;
  costPerSeat: number;
}

export interface UpcomingRenewalApi {
  id: number;
  softwareName: string;
  vendor: string | null;
  entityName: string | null;
  clientName: string | null;
  totalSeats: number;
  cost: number | null;
  renewalDate: string | null;
  expiryDate: string | null;
  daysToExpiry: number | null;
}

export interface DepartmentEfficiencyApi {
  departmentName: string;
  employeeCount: number;
  assetCount: number;
  licenseCost: number;
  assetsPerEmployee: number;
  costPerEmployee: number;
}

export interface AllocationTrendApi {
  monthLabel: string;
  newAllocations: number;
  activeAllocations: number;
}

export interface AssetUtilizationApi {
  status: string;
  assetCount: number;
  assignedCount: number;
  unassignedCount: number;
  percentOfFleet: number;
}

export interface DepartmentCostApi {
  departmentName: string;
  softwareTitles: number;
  totalSeats: number;
  usedSeats: number;
  totalCost: number;
}

export interface ClientCostApi {
  clientName: string;
  softwareTitles: number;
  totalSeats: number;
  totalCost: number;
  allocatedSeats: number;
}

export interface EntityCostApi {
  entityName: string;
  softwareTitles: number;
  totalSeats: number;
  usedSeats: number;
  totalCost: number;
}

export interface GrowthTrendApi {
  monthLabel: string;
  newUsers: number;
  cumulativeUsers: number;
  newLicenseSeats: number;
  cumulativeLicenseSeats: number;
}

export interface CapacityRunwayApi {
  softwareName: string;
  totalSeats: number;
  freeSeats: number;
  seatsConsumedLast90Days: number;
  estimatedWeeksOfRunway: number | null;
  recommendation: string;
}

export interface ExecutiveOverviewApi {
  investmentSummary: InvestmentSummaryApi;
  topExpensiveSoftware: TopExpensiveSoftwareApi[];
  upcomingRenewals: UpcomingRenewalApi[];
  departmentCost: DepartmentCostApi[];
  clientCost: ClientCostApi[];
  entityCost: EntityCostApi[];
  departmentEfficiency: DepartmentEfficiencyApi[];
  assetUtilization: AssetUtilizationApi[];
  allocationTrends: AllocationTrendApi[];
  growthTrends: GrowthTrendApi[];
  capacityRunway: CapacityRunwayApi[];
}

export async function getExecutiveOverview(): Promise<ExecutiveOverviewApi> {
  const response = await api.get<ExecutiveOverviewApi>(
    '/Analytics/executive-overview'
  );

  return response.data;
}
