import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

type Props = {
    data: {
        underWarranty: number;
        expiredWarranty: number;
        noWarranty: number;
    };
};

export default function WarrantyChart({ data }: Props) {
    const chartData = [
        {
            name: "Under Warranty",
            value: data.underWarranty,
        },
        {
            name: "Expired",
            value: data.expiredWarranty,
        },
        {
            name: "No Warranty",
            value: data.noWarranty,
        },
    ];

    const COLORS = [
        "#16a34a",
        "#dc2626",
        "#64748b",
    ];

    return (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
                Warranty Status
            </h2>

            <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        label
                    >
                        {chartData.map((_, index) => (
                            <Cell
                                key={index}
                                fill={COLORS[index]}
                            />
                        ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
