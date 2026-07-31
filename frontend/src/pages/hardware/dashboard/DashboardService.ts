import api from "@/services/api";

export const getDashboardOverview = async () => {
    const { data } = await api.get("/asset/dashboard/overview");
    return data;
};
