import api from "@/lib/api/client";

export async function loadUsers() {
  // GET /Users is paginated server-side (UserSearchRequest.PageSize
  // defaults to 10 - see UsersController.GetAll) - this call needs the
  // complete active-user directory for pickers like the Hardware
  // Allocate/Reassign dialog's user search, not just the first page.
  // 1000 comfortably covers this app's scale, matching the same
  // large-pageSize pattern loadUsersForRequests.ts already uses (500)
  // for the same endpoint.
  const response = await api.get("/Users", {
    params: { pageSize: 1000 },
  });

  const items = response.data?.data?.items;

  if (!Array.isArray(items)) {
    console.error("Invalid users response:", response.data);
    return [];
  }

  return items
    .filter((user: any) => user?.isActive !== false)
    .map((user: any) => ({
      id: user.id,
      name: user.fullName ?? user.name ?? user.email ?? `User ${user.id}`,
      fullName: user.fullName ?? "",
      email: user.email ?? "",
      employeeCode: user.employeeCode ?? "",
      companyId: user.companyId ?? null,
      companyName: user.companyName ?? "",
      departmentId: user.departmentId ?? null,
      departmentName: user.departmentName ?? "",
      reportsToUserId: user.reportsToUserId ?? null,
      reportsToUserName: user.reportsToUserName ?? "",
      role: user.role ?? "",
    }));
}

export async function loadDepartments() {
  const response = await api.get("/Department");

  const items = response.data?.data;

  if (!Array.isArray(items)) {
    console.error("Invalid departments response:", response.data);
    return [];
  }

  return items
    .filter((department: any) => department?.isActive !== false)
    .map((department: any) => ({
      id: department.id,
      name:
        department.departmentName ??
        department.name ??
        department.departmentCode ??
        `Department ${department.id}`,
      departmentName: department.departmentName ?? "",
      departmentCode: department.departmentCode ?? "",
      companyId: department.companyId ?? null,
      companyName: department.companyName ?? "",
      description: department.description ?? "",
    }));
}

export async function loadCompanies() {
  const response = await api.get("/Company");

  const items = response.data?.data;

  if (!Array.isArray(items)) {
    console.error("Invalid companies response:", response.data);
    return [];
  }

  return items
    .filter((company: any) => company?.isActive !== false)
    .map((company: any) => ({
      id: company.id,
      name:
        company.companyName ??
        company.name ??
        `Company ${company.id}`,
      companyName: company.companyName ?? "",
    }));
}

export async function loadClients() {
  const response = await api.get("/Client");

  const items = response.data?.data;

  if (!Array.isArray(items)) {
    console.error("Invalid clients response:", response.data);
    return [];
  }

  return items
    .filter((client: any) => client?.isActive !== false)
    .map((client: any) => ({
      id: client.id,
      name:
        client.clientName ??
        client.name ??
        `Client ${client.id}`,
      clientName: client.clientName ?? "",
    }));
}
