import api from "@/lib/api/client";

export default async function loadAssets() {
  const response = await api.get("/api/Asset");

  // Backend returns an array directly.
  return Array.isArray(response.data) ? response.data : [];
}
