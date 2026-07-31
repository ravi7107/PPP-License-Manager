import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Asset = {
    id: number;
    assetTag: string;
    assetName: string;
    assetType: string;
    departmentName: string;
    status: string;
    createdAt: string;
};

type Props = {
    data: Asset[];
};

export default function RecentAssetsTable({ data }: Props) {
    return (
        <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b p-5">
                <h2 className="text-lg font-semibold">
                    Recent Assets
                </h2>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Asset Tag</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map(asset => (
                        <TableRow key={asset.id}>
                            <TableCell>{asset.assetTag}</TableCell>
                            <TableCell>{asset.assetName}</TableCell>
                            <TableCell>{asset.assetType}</TableCell>
                            <TableCell>{asset.departmentName}</TableCell>
                            <TableCell>{asset.status}</TableCell>
                            <TableCell>
                                {new Date(asset.createdAt).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
