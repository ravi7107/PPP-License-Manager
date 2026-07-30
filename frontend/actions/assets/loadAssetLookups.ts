import api from "@/lib/api/client";

export async function loadUsers() {
  const response = await api.get("/api/Users");
  return response.data.data;
}

export async function loadDepartments() {
  const response = await api.get("/api/Department");
  return response.data.data;
}

export async function loadCompanies() {
  const response = await api.get("/api/Company");
  return response.data.data;
}

export async function loadClients() {
  const response = await api.get("/api/Client");
  return response.data.data;
}
