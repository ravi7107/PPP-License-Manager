'use client';

import '@/index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AppLayout } from '@/app/layout/app-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import LoginPage from '@/app/pages/login/login-page';

import DashboardPage from '@/app/pages/dashboard/dashboard-page';
import HardwarePage from '@/app/pages/hardware/hardware-page';
import LicensesPage from '@/app/pages/licenses/licenses-page';
import ReportsPage from '@/app/pages/reports/reports-page';
import AllocationsPage from '@/app/pages/allocations/allocations-page';
import PurchaseRequisitionsPage from '@/app/pages/purchase-requisitions/purchase-requisitions-page';
import PendingApprovalsPage from '@/app/pages/purchase-requisitions/pending-approvals-page';
import AvailabilityPage from '@/app/pages/availability/availability-page';
import ApprovalsPage from '@/app/pages/requests/approvals-page';
import MyRequestsPage from '@/app/pages/requests/my-requests-page';
import SearchPage from '@/app/pages/search/search-page';
import ExecutiveDashboardPage from '@/app/pages/executive/executive-dashboard-page';
import UsersPage from '@/app/pages/directory/users-page';
import DepartmentsPage from '@/app/pages/directory/departments-page';
import EntitiesPage from '@/app/pages/directory/entities-page';
import ClientsPage from '@/app/pages/directory/clients-page';
import OfficeLocationsPage from '@/app/pages/directory/office-locations-page';
import AccessManagementPage from '@/app/pages/access/access-management-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<LoginPage />} />

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
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="my-requests" element={<MyRequestsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="executive" element={<ExecutiveDashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="entities" element={<EntitiesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="office-locations" element={<OfficeLocationsPage />} />
          <Route path="access-management" element={<AccessManagementPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
