export function getDashboardKpis() {
  return {
    totalAssets: 420,
    allocatedAssets: 318,
    availableAssets: 92,
    assetsUnderMaintenance: 10,
    totalLicenseSeats: 850,
    availableLicenseSeats: 180,
    expiringLicenses: 6,
  };
}

export function getLicenseUtilizationChartData() {
  return [
    { name: "AutoCAD", used: 42, available: 8 },
    { name: "Revit", used: 18, available: 7 },
    { name: "Tekla", used: 24, available: 6 },
    { name: "Navisworks", used: 10, available: 5 },
  ];
}

export function getCostByEntityChartData() {
  return [
    { entity: "Engineering", cost: 120000 },
    { entity: "Projects", cost: 85000 },
    { entity: "Corporate", cost: 40000 },
  ];
}

export function getCostByClientChartData() {
  return [
    { client: "Client A", cost: 95000 },
    { client: "Client B", cost: 70000 },
    { client: "Internal", cost: 80000 },
  ];
}

export function getDepartmentWiseAssetsChartData() {
  return [
    { department: "Engineering", count: 120 },
    { department: "Design", count: 80 },
    { department: "IT", count: 35 },
    { department: "Finance", count: 18 },
    { department: "HR", count: 12 },
  ];
}

export function getMonthlyAllocationTrendChartData() {
  return [
    { month: "Jan", allocations: 15 },
    { month: "Feb", allocations: 18 },
    { month: "Mar", allocations: 20 },
    { month: "Apr", allocations: 24 },
    { month: "May", allocations: 21 },
    { month: "Jun", allocations: 27 },
  ];
}

export function getPendingApprovalTrendChartData() {
  return [
    { month: "Jan", pending: 5 },
    { month: "Feb", pending: 4 },
    { month: "Mar", pending: 7 },
    { month: "Apr", pending: 6 },
    { month: "May", pending: 3 },
    { month: "Jun", pending: 2 },
  ];
}

export function getSoftwareExpiryTimelineChartData() {
  return [
    { name: "AutoCAD", daysToExpiry: 18 },
    { name: "Revit", daysToExpiry: 35 },
    { name: "Tekla", daysToExpiry: 52 },
    { name: "Navisworks", daysToExpiry: 70 },
  ];
}

export function getLowAvailabilityLicenses() {
  return [
    {
      id: 1,
      softwareName: "AutoCAD",
      totalSeats: 50,
      seatsUsed: 48,
    },
    {
      id: 2,
      softwareName: "Revit",
      totalSeats: 25,
      seatsUsed: 24,
    },
  ];
}

export function getExpiringLicensesList() {
  return [
    {
      id: 1,
      softwareName: "AutoCAD",
      renewalDate: "2026-08-10",
    },
    {
      id: 2,
      softwareName: "Tekla",
      renewalDate: "2026-08-25",
    },
  ];
}
