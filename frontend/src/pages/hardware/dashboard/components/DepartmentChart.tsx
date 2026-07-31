import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

type Props = {
    data: {
        departmentName: string;
        assetCount: number;
    }[];
};

export default function DepartmentChart({ data }: Props) {
    return (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
                Assets by Department
            </h2>

            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        dataKey="departmentName"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                        dataKey="assetCount"
                        radius={[6, 6, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
