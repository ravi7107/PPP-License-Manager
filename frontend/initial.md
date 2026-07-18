# Requirements
## Summary
The "Enterprise License & Asset Management System" (PPS) is an internal web application for managing hardware assets, software licenses, license allocation, temporary sharing, and approval workflows within an engineering company. It serves Super Administrators, IT Administrators, Team Leaders, and Management with role-specific modules — from full system control to read-only executive dashboards — enabling efficient tracking of costly engineering software licenses (AutoCAD, Revit, Tekla, BIM, CAD, Microsoft Office, etc.) and hardware assets. Access is controlled via UI Bakery's built-in authentication and custom roles (Super Administrator, IT Administrator, Team Leader, Management), with each role seeing only the modules relevant to them. The app currently uses mock data; a real PostgreSQL data source can be connected later.

## Use cases
- Application Shell & Executive Dashboard
  1) User logs in via UI Bakery built-in auth and is assigned one of the four custom roles.
  2) User sees a responsive shell with a sidebar navigation showing only modules allowed for their role.
  3) User lands on a role-aware dashboard home page showing key metrics: total hardware assets, total licenses, active allocations, pending approvals, and expiring licenses.
  4) Management/executives see high-level KPI cards and charts (license utilization, cost breakdown by department/software) with drill-down disabled (read-only).
  5) IT Administrators and Super Administrators see actionable widgets (pending approvals count, low-availability license alerts) linking to relevant modules.

- Hardware Asset Management
  1) IT Administrator/Super Administrator opens the "Hardware Assets" module from the sidebar.
  2) User views a searchable/filterable table of hardware assets (asset tag, type, model, serial number, assigned team, assigned user, status, purchase date, warranty expiry).
  3) User adds a new hardware asset via a form (asset details, assigned team/user, status).
  4) User edits or retires/decommissions an existing asset.
  5) Team Leader views a read-only, filtered list of hardware assets assigned to their own team only.

- Software License Management
  1) IT Administrator/Super Administrator opens the "Software Licenses" module.
  2) User views a table of software licenses (software name, vendor, license type, total seats, seats used, seats available, cost, renewal/expiry date, assigned department).
  3) User adds a new software license record (software name, type, seat count, cost, expiry date).
  4) User edits license details or marks a license as expired/renewed.
  5) Management views a read-only license inventory list with cost and utilization columns, without edit access.

- License Allocation & Temporary Sharing
  1) IT Administrator opens the "Allocations" module and views current license-to-user/team assignments.
  2) IT Administrator allocates an available license seat to a specific user/team from a selection form.
  3) IT Administrator revokes or reassigns an allocated seat.
  4) Team Leader requests a license for a team member via a "Request License" form (selects software, justification, duration).
  5) Team Leader temporarily releases a license seat assigned to their team back into the shared pool for a defined period.
  6) System tracks the temporary sharing period and automatically flags/returns the seat to the original holder when the period ends.

- Approval Workflow
  1) Team Leader submits a license request or a temporary release/sharing request.
  2) IT Administrator/Super Administrator opens the "Approvals" module and sees a queue of pending requests with requester, request type, software, dates, and justification.
  3) IT Administrator approves or rejects the request, optionally adding a comment.
  4) Requesting Team Leader sees updated status (Approved/Rejected) reflected on their "My Requests" view.
  5) Approved license requests automatically update the Allocation module (seat assigned) once approved.

- Reports & Cost Analysis (Management)
  1) Management opens the "Reports" module.
  2) User views cost analysis by software vendor, department, and team (read-only charts and tables).
  3) User views license utilization trends (seats used vs. available over time) and upcoming renewal/expiry forecasts.
  4) User exports/filters reports by date range, department, or software (UI-level filter, no edit access).

## Plan
### Application Shell & Executive Dashboard
1. [x] Set up the app shell with a responsive sidebar/topbar layout using shadcn components (Sidebar, Avatar/user menu, breadcrumb).
2. [x] Define navigation items for modules: Dashboard, Hardware Assets, Software Licenses, Allocations, Approvals, Reports, and conditionally render each nav item based on the current user's UI Bakery custom role (Super Administrator, IT Administrator, Team Leader, Management) using `useUser()`.
3. [x] Create mock data models (TypeScript fixtures) for hardware assets, software licenses, allocations, requests/approvals, teams, and users.
4. [x] Build the Dashboard page with role-aware KPI cards (total assets, total licenses, active allocations, pending approvals, expiring licenses) using mock data.
5. [x] Add charts (license utilization by software, cost breakdown by department) to the Dashboard using a chart library, visible to Super Administrator, IT Administrator, and Management roles.
6. [x] Add actionable widgets on the Dashboard (pending approvals list, low-seat-availability alerts) visible only to Super Administrator and IT Administrator roles, linking to respective modules.
7. [x] Ensure layout and components are responsive across desktop and tablet breakpoints using Tailwind.

### Hardware Asset Management
1. [] Create a Hardware Assets list page with a searchable, filterable, sortable data table (asset tag, type, model, serial number, assigned team, assigned user, status, purchase date, warranty expiry) using mock data.
2. [] Build an "Add Hardware Asset" form (modal or side panel) with fields for asset details, assigned team/user, and status; append new record to mock data on submit.
3. [] Build an "Edit Hardware Asset" form pre-filled with existing values, supporting status change to Retired/Decommissioned.
4. [] Restrict Add/Edit/Retire actions to Super Administrator and IT Administrator roles; hide these controls for Team Leader and Management.
5. [] For Team Leader role, filter the Hardware Assets table to show only assets assigned to their own team (based on mock team-user mapping) in read-only mode.
6. [] Add status badges (Active, In Repair, Retired, Decommissioned) with distinct visual styling.

### Software License Management
1. [] Create a Software Licenses list page with a data table (software name, vendor, license type, total seats, seats used, seats available, cost, renewal/expiry date, assigned department) using mock data.
2. [] Build an "Add Software License" form (software name, vendor, license type, seat count, cost, expiry date).
3. [] Build an "Edit Software License" form supporting status updates (Active, Expired, Renewed).
4. [] Restrict Add/Edit actions to Super Administrator and IT Administrator roles.
5. [] Provide a read-only view of the Software Licenses table (with cost and utilization columns, no action buttons) for the Management role.
6. [] Add visual indicators for licenses nearing expiry (e.g., badge/color for licenses expiring within 30 days).

### License Allocation & Temporary Sharing
1. [] Create an Allocations page listing current license-to-user/team assignments (software, assigned user, team, allocation date, status) using mock data.
2. [] Build an "Allocate License" form for IT Administrator/Super Administrator to assign an available seat to a user/team, validating against available seat count.
3. [] Add a "Revoke/Reassign" action on each allocation row, restricted to Super Administrator and IT Administrator roles.
4. [] Build a "Request License" form for Team Leaders (select software, team member, justification, requested duration) that creates a pending request record.
5. [] Build a "Release License Temporarily" action for Team Leaders on their team's allocations, capturing a release period (start/end date) and creating a pending sharing request.
6. [] Implement mock logic to flag temporarily shared seats and auto-mark them for return to the original holder when the defined period ends (simulated via mock date comparison).
7. [] Restrict visibility of Allocations page to Super Administrator, IT Administrator, and Team Leader (Team Leader sees only their team's allocations).

### Approval Workflow
1. [] Create an Approvals page listing pending requests (requester, request type: New License/Temporary Release, software, dates, justification) using mock data, visible to Super Administrator and IT Administrator roles.
2. [] Add Approve/Reject actions per request row with an optional comment field; update request status in mock data on action.
3. [] On approval of a "New License" request, simulate updating the Allocations mock data to reflect the new seat assignment.
4. [] On approval of a "Temporary Release" request, simulate updating the Allocations mock data to mark the seat as temporarily shared.
5. [] Build a "My Requests" page for Team Leaders showing their submitted requests and current status (Pending, Approved, Rejected) with comments.
6. [] Add status badges (Pending, Approved, Rejected) with distinct styling across both Approvals and My Requests pages.

### Reports & Cost Analysis (Management)
1. [] Create a Reports page visible to Super Administrator, IT Administrator, and Management roles (read-only for Management).
2. [] Build a cost analysis view with charts/tables breaking down license cost by vendor, department, and team using mock data.
3. [] Build a license utilization trend view (seats used vs. available) using a line/bar chart with mock historical data points.
4. [] Build an upcoming renewals/expiry forecast table listing licenses expiring in the next 30/60/90 days.
5. [] Add UI-level filters (date range, department, software) to refine report views without granting edit access.
