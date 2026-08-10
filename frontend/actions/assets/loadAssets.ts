import api from "@/lib/api/client";

export default async function loadAssets() {
  const response = await api.get("/Asset");

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}
