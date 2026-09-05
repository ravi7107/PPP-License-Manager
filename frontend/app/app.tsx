'use client';

import '@/index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AppLayout } from '@/app/layout/app-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import LoginPage from '@/app/pages/login/login-page';

import DashboardPage from '@/app/pages/dashboard/dashboard-page';
import HardwarePage from '@/app/pages/hardware/hardware-page';
import LicensesPage from '@/app/pages/licenses/licenses-page';
import ReportsPage from '@/app/pages/reports/reports-page';
import ReportCenterPage from '@/app/pages/reports/report-center-page';
import ReportRunPage from '@/app/pages/reports/report-run-page';
import SavedReportsPage from '@/app/pages/reports/saved-reports-page';
import ReportHistoryPage from '@/app/pages/reports/report-history-page';
import AllocationsPage from '@/app/pages/allocations/allocations-page';
import PurchaseRequisitionsPage from '@/app/pages/purchase-requisitions/purchase-requisitions-page';
import PendingApprovalsPage from '@/app/pages/purchase-requisitions/pending-approvals-page';
import PrPublicApprovalPage from '@/app/pages/purchase-requisitions/pr-public-approval-page';
import PrPublicFinancePage from '@/app/pages/purchase-requisitions/pr-public-finance-page';
import PurchaseRequisitionContactsPage from '@/app/pages/directory/purchase-requisition-contacts-page';
import PurchaseRequisitionSettingsPage from '@/app/pages/settings/purchase-requisition-settings-page';
import AvailabilityPage from '@/app/pages/availability/availability-page';
import ApprovalsPage from '@/app/pages/requests/approvals-page';
import MyRequestsPage from '@/app/pages/requests/my-requests-page';
import SearchPage from '@/app/pages/search/search-page';
import ExecutiveDashboardPage from '@/app/pages/executive/executive-dashboard-page';
import UsersPage from '@/app/pages/directory/users-page';
import DepartmentsPage from '@/app/pages/directory/departments-page';
import EntitiesPage from '@/app/pages/directory/entities-page';
import ClientsPage from '@/app/pages/directory/clients-page';
import VendorsPage from '@/app/pages/directory/vendors-page';
import OfficeLocationsPage from '@/app/pages/directory/office-locations-page';
import AccessManagementPage from '@/app/pages/access/access-management-page';
import MaterialItemCategoriesPage from '@/app/pages/material-movement/masters/material-item-categories-page';
import MaterialItemsPage from '@/app/pages/material-movement/masters/material-items-page';
import MaterialCostCentersPage from '@/app/pages/material-movement/masters/material-cost-centers-page';
import MaterialTransportersPage from '@/app/pages/material-movement/masters/material-transporters-page';
import MaterialApprovalWorkflowsPage from '@/app/pages/material-movement/masters/material-approval-workflows-page';
import MaterialMovementsPage from '@/app/pages/material-movement/movements/material-movements-page';
import InventoryPage from '@/app/pages/inventory/inventory-page';
import UtilizationDashboardPage from '@/app/pages/utilization/dashboard/utilization-dashboard-page';
import UtilizationUploadPage from '@/app/pages/utilization/upload/utilization-upload-page';
import UtilizationTierSettingsPage from '@/app/pages/utilization/settings/utilization-tier-settings-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<LoginPage />} />

        {/*
          Unauthenticated purchase requisition approval landing page,
          reached from an email link - deliberately outside
          ProtectedRoute (see pr-public-approval-page.tsx).
        */}
        <Route path="/pr-approval/:token" element={<PrPublicApprovalPage />} />

        {/*
          Unauthenticated Finance landing page, reached from the
          "Purchase Requisition Approved" Finance notification email -
          deliberately outside ProtectedRoute (see
          pr-public-finance-page.tsx).
        */}
        <Route path="/pr-finance/:token" element={<PrPublicFinancePage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="hardware" element={<HardwarePage />} />
          <Route path="licenses" element={<LicensesPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="purchase-requisitions" element={<PurchaseRequisitionsPage />} />
          <Route path="purchase-requisition-approvals" element={<PendingApprovalsPage />} />
          <Route path="purchase-requisition-contacts" element={<PurchaseRequisitionContactsPage />} />
          <Route path="purchase-requisition-settings" element={<PurchaseRequisitionSettingsPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="my-requests" element={<MyRequestsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="executive" element={<ExecutiveDashboardPage />} />
          <Route path="reports" element={<Navigate to="/report-center" replace />} />
          <Route path="report-center" element={<ReportCenterPage />} />
          <Route path="report-center/:reportId" element={<ReportRunPage />} />
          <Route path="saved-reports" element={<SavedReportsPage />} />
          <Route path="report-history" element={<ReportHistoryPage />} />

          <Route path="users" element={<UsersPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="entities" element={<EntitiesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="material-movements" element={<MaterialMovementsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="office-locations" element={<OfficeLocationsPage />} />
          <Route path="access-management" element={<AccessManagementPage />} />
          <Route path="material-item-categories" element={<MaterialItemCategoriesPage />} />
          <Route path="material-items" element={<MaterialItemsPage />} />
          <Route path="material-cost-centers" element={<MaterialCostCentersPage />} />
          <Route path="material-transporters" element={<MaterialTransportersPage />} />
          <Route path="material-approval-workflows" element={<MaterialApprovalWorkflowsPage />} />
          <Route path="utilization" element={<UtilizationDashboardPage />} />
          <Route path="utilization/upload" element={<UtilizationUploadPage />} />
          <Route path="utilization/settings" element={<UtilizationTierSettingsPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
