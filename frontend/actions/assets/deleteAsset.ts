import api from '@/lib/api/client';

// Real delete: DELETE /api/Asset/{id} against the ASP.NET backend.
export default async function deleteAsset(payload: { id: number }) {
  const response = await api.delete(`/Asset/${payload.id}`);
  return response.data;
}
