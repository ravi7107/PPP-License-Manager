import api from "@/lib/api/client";

export default async function updateAsset(
  payload: any,
) {
  const { id, ...data } = payload;

  const response = await api.put(
    `/Asset/${id}`,
    data,
  );

  return response.data;
}
