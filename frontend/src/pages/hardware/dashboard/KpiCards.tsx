import {
  Monitor,
  CheckCircle,
  UserCheck,
  Wrench,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

type Props = {
  data: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    maintenanceAssets: number;
    warrantyExpired: number;
    retiredAssets: number;
  };
};

const cards = [
  {
    key: "totalAssets",
    title: "Total Assets",
    icon: Monitor,
  },
  {
    key: "assignedAssets",
    title: "Assigned",
    icon: UserCheck,
  },
  {
    key: "availableAssets",
    title: "Available",
    icon: CheckCircle,
  },
  {
    key: "maintenanceAssets",
    title: "Maintenance",
    icon: Wrench,
  },
  {
    key: "warrantyExpired",
    title: "Warranty Expired",
    icon: ShieldAlert,
  },
  {
    key: "retiredAssets",
    title: "Retired",
    icon: AlertTriangle,
  },
];

export default function KpiCards({ data }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className="rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{card.title}</span>
              <Icon className="h-5 w-5 text-blue-600" />
            </div>

            <div className="mt-4 text-3xl font-bold">
              {data[card.key as keyof typeof data]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
