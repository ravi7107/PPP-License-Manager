import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Pencil,
  Plus,
  KeyRound,
  RefreshCw,
  X,
} from 'lucide-react';

import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  User,
} from '@/lib/api/users.api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { getCompanies, type Company } from '@/lib/api/companies.api';
import { getDepartments, type Department } from '@/lib/api/departments.api';

const ROLES = [
  { id: 1, name: 'Super Admin' },
  { id: 2, name: 'IT Admin' },
  { id: 3, name: 'Team Lead' },
  { id: 4, name: 'Manager' },
  { id: 5, name: 'Employee' },
];

interface UserFormValues {
  fullName: string;
  employeeCode: string;
  email: string;
  password: string;
  roleId: number;
  companyId: number | null;
  departmentId: number | null;
  reportsToUserId: number | null;
  isActive: boolean;
}

const EMPTY_FORM: UserFormValues = {
  fullName: '',
  employeeCode: '',
  email: '',
  password: '',
  roleId: 5,
  companyId: null,
  departmentId: null,
  reportsToUserId: null,
  isActive: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormValues>({ ...EMPTY_FORM });

  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');

      const [userResponse, companyResponse, departmentResponse] =
        await Promise.all([
          getUsers('', 1, 500),
          getCompanies(),
          getDepartments(),
        ]);

      setUsers(userResponse.items ?? []);
      setCompanies(companyResponse ?? []);
      setDepartments(departmentResponse ?? []);
    } catch (err: any) {
      console.error('Load users failed:', err);

      setError(
        err?.response?.data?.message ||
          'Unable to load user directory data from the server.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.isActive),
    [companies]
  );

  const reportingUsers = useMemo(
    () =>
      users
        .filter(
          (user) =>
            user.isActive &&
            (user.role === 'Team Lead' ||
              user.role === 'Manager') &&
            user.id !== selectedUser?.id
        )
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName)
        ),
    [users, selectedUser]
  );

  const filteredDepartments = useMemo(() => {
    if (form.companyId === null) {
      return [];
    }

    return departments.filter(
      (department) =>
        department.isActive &&
        department.companyId === form.companyId
    );
  }, [departments, form.companyId]);

  const filterDepartments = useMemo(() => {
    if (companyFilter === 'all') {
      return departments.filter(
        (department) => department.isActive
      );
    }

    const companyId = Number(companyFilter);

    return departments.filter(
      (department) =>
        department.isActive &&
        department.companyId === companyId
    );
  }, [departments, companyFilter]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (roleFilter !== 'all') {
      result = result.filter(
        (user) => user.role === roleFilter
      );
    }

    if (companyFilter !== 'all') {
      const companyId = Number(companyFilter);

      result = result.filter(
        (user) => user.companyId === companyId
      );
    }

    if (departmentFilter !== 'all') {
      const departmentId = Number(departmentFilter);

      result = result.filter(
        (user) => user.departmentId === departmentId
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      result = result.filter((user) =>
        [
          user.fullName,
          user.employeeCode,
          user.email,
          user.role,
          user.companyName ?? '',
          user.departmentName ?? '',
        ].some((value) =>
          value.toLowerCase().includes(q)
        )
      );
    }

    return result;
  }, [
    users,
    search,
    roleFilter,
    companyFilter,
    departmentFilter,
  ]);

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function openCreateUser() {
    clearMessages();

    setSelectedUser(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  }

  function openEditUser(user: User) {
    clearMessages();

    const role = ROLES.find(
      (item) => item.name === user.role
    );

    setSelectedUser(user);

    setForm({
      fullName: user.fullName,
      employeeCode: user.employeeCode,
      email: user.email,
      password: '',
      roleId: role?.id ?? 5,
      companyId: user.companyId,
      departmentId: user.departmentId,
      reportsToUserId: user.reportsToUserId,
      isActive: user.isActive,
    });

    setFormOpen(true);
  }

  function closeUserForm() {
    if (saving) return;

    setFormOpen(false);
    setSelectedUser(null);
    setForm({ ...EMPTY_FORM });
  }

  async function handleUserSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    const fullName = form.fullName.trim();
    const employeeCode = form.employeeCode.trim();
    const email = form.email.trim();

    if (!fullName || !employeeCode || !email) {
      setError('Please complete all required fields.');
      return;
    }

    if (!selectedUser && form.password.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      );
      return;
    }

    if (form.companyId === null) {
      setError('Please select an Entity.');
      return;
    }

    if (form.departmentId === null) {
      setError('Please select a Department.');
      return;
    }

    try {
      setSaving(true);

      if (selectedUser) {
        await updateUser(selectedUser.id, {
          fullName,
          employeeCode,
          email,
          roleId: form.roleId,
          companyId: form.companyId,
          departmentId: form.departmentId,
          reportsToUserId: form.reportsToUserId,
          isActive: form.isActive,
        });

        setSuccess('User updated successfully.');
      } else {
        await createUser({
          fullName,
          employeeCode,
          email,
          password: form.password,
          roleId: form.roleId,
          companyId: form.companyId,
          departmentId: form.departmentId,
          reportsToUserId: form.reportsToUserId,
          isActive: form.isActive,
        });

        setSuccess('User created successfully.');
      }

      setFormOpen(false);
      setSelectedUser(null);
      setForm({ ...EMPTY_FORM });

      await loadUsers();
    } catch (err: any) {
      console.error('Save user failed:', err);

      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err?.response?.data?.message ||
            'Unable to save the user.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function openResetPassword(user: User) {
    clearMessages();

    setResetUser(user);
    setNewPassword('');
  }

  function closeResetPassword() {
    if (resettingPassword) return;

    setResetUser(null);
    setNewPassword('');
  }

  async function handlePasswordReset(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!resetUser) return;

    clearMessages();

    if (newPassword.length < 8) {
      setError(
        'New password must contain at least 8 characters.'
      );
      return;
    }

    try {
      setResettingPassword(true);

      await resetUserPassword(
        resetUser.id,
        newPassword
      );

      setSuccess(
        `Password reset successfully for ${resetUser.fullName}.`
      );

      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('Password reset failed:', err);

      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err?.response?.data?.message ||
            'Unable to reset the password.'
        );
      }
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">User Management</h1>
          <p className="nova-cmdbar-desc">
            Create and manage PPS License Manager users, roles and
            account status.
          </p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button size="sm" onClick={openCreateUser}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--nova-teal-500)',
            background: 'var(--nova-teal-50)',
            color: 'var(--nova-teal-600)',
          }}
        >
          {success}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search name, employee code or email…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>

            {ROLES.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setDepartmentFilter('all');
            }}
          >
            <option value="all">All Entities</option>

            {activeCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All Departments</option>

            {filterDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.departmentName}
              </option>
            ))}
          </select>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filteredUsers.length} of {users.length} user
            {users.length === 1 ? '' : 's'}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={loading}
            onClick={loadUsers}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Entity</th>
                <th>Department</th>
                <th>Reports To</th>
                <th>Status</th>
                <th>Created</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="nova-mono">{user.employeeCode}</td>

                    <td className="font-medium">{user.fullName}</td>

                    <td className="nova-cell-sub">{user.email}</td>

                    <td>
                      <span className="nova-pill nova-pill-neutral">
                        <span className="nova-dot" />
                        {user.role}
                      </span>
                    </td>

                    <td className="nova-cell-sub">
                      {user.companyName ?? '—'}
                    </td>

                    <td className="nova-cell-sub">
                      {user.departmentName ?? '—'}
                    </td>

                    <td className="nova-cell-sub">
                      {user.reportsToUserName ?? '—'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${user.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="nova-cell-faint">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="nova-right space-x-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit User"
                        onClick={() => openEditUser(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Reset Password"
                        onClick={() => openResetPassword(user)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedUser
                    ? 'Edit User'
                    : 'Add User'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedUser
                    ? 'Update user account information, role and status.'
                    : 'Create a new PPS License Manager user account.'}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeUserForm}
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form
              onSubmit={handleUserSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Employee Code
                </label>

                <Input
                  value={form.employeeCode}
                  maxLength={20}
                  placeholder="EMP0002"
                  required
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      employeeCode: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Full Name
                </label>

                <Input
                  value={form.fullName}
                  maxLength={100}
                  placeholder="Employee name"
                  required
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      fullName: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>

                <Input
                  type="email"
                  value={form.email}
                  maxLength={150}
                  placeholder="employee@pps.com"
                  required
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              {!selectedUser && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Initial Password
                  </label>

                  <Input
                    type="password"
                    value={form.password}
                    minLength={8}
                    maxLength={20}
                    placeholder="Minimum 8 characters"
                    required
                    autoComplete="new-password"
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        password: e.target.value,
                      }))
                    }
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    Password must contain between 8 and
                    20 characters.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Role
                </label>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.roleId}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      roleId: Number(e.target.value),
                    }))
                  }
                >
                  {ROLES.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Entity
                </label>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.companyId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;

                    setForm((current) => ({
                      ...current,
                      companyId: value ? Number(value) : null,
                      departmentId: null,
                    }));
                  }}
                >
                  <option value="">Select Entity</option>

                  {activeCompanies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Department
                </label>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.departmentId ?? ''}
                  disabled={form.companyId === null}
                  onChange={(e) => {
                    const value = e.target.value;

                    setForm((current) => ({
                      ...current,
                      departmentId: value ? Number(value) : null,
                    }));
                  }}
                >
                  <option value="">
                    {form.companyId === null
                      ? 'Select Entity first'
                      : 'Select Department'}
                  </option>

                  {filteredDepartments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.departmentName}
                    </option>
                  ))}
                </select>

                {form.companyId !== null &&
                  filteredDepartments.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No active departments are configured for this entity.
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Reports To
                </label>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.reportsToUserId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;

                    setForm((current) => ({
                      ...current,
                      reportsToUserId: value
                        ? Number(value)
                        : null,
                    }));
                  }}
                >
                  <option value="">None</option>

                  {reportingUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.fullName} ({user.role})
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-muted-foreground">
                  Select the Team Lead or Manager responsible
                  for this user.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                />

                Active account
              </label>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={closeUserForm}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : selectedUser
                      ? 'Update User'
                      : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <KeyRound className="h-5 w-5" />
                  Reset Password
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Set a new password for{' '}
                  <strong>{resetUser.fullName}</strong>.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={resettingPassword}
                onClick={closeResetPassword}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form
              onSubmit={handlePasswordReset}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  New Password
                </label>

                <Input
                  type="password"
                  value={newPassword}
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  required
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={resettingPassword}
                  onClick={closeResetPassword}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={resettingPassword}
                >
                  {resettingPassword
                    ? 'Resetting...'
                    : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
