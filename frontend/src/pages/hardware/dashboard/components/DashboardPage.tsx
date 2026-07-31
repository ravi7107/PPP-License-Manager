import DepartmentChart from "./components/DepartmentChart";
import ManufacturerChart from "./components/ManufacturerChart";
import AssetTypeChart from "./components/AssetTypeChart";
import WarrantyChart from "./components/WarrantyChart";
import RecentAssetsTable from "./components/RecentAssetsTable";


<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <DepartmentChart
        data={dashboard.departmentSummary}
    />

    <ManufacturerChart
    data={dashboard.manufacturerSummary}
/>

<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <AssetTypeChart
        data={dashboard.assetTypeSummary}
    />

    <WarrantyChart
        data={dashboard.warranty}
    />

<RecentAssetsTable
    data={dashboard.recentAssets}
/>
</div>
</div>
