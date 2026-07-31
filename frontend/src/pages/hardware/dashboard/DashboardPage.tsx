import { useEffect, useState } from "react";
import { getDashboardOverview } from "./DashboardService";
import KpiCards from "./components/KpiCards";


export default function DashboardPage() {
    const [dashboard, setDashboard] = useState<any>();

    useEffect(() => {
        getDashboardOverview().then(setDashboard);
    }, []);

    if (!dashboard)
        return <div>Loading...</div>;

return (
    <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">
            Hardware Dashboard
        </h1>

        <KpiCards data={dashboard.kpis} />
    </div>
);   
}
