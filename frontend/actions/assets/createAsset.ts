import api from "@/lib/api/client";

export default async function createAsset(payload: any) {
  const response = await api.post("/Asset", payload);
  return response.data;
}
