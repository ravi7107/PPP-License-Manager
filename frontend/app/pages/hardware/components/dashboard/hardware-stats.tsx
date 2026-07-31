import {
  Monitor,
  CheckCircle2,
  Laptop,
  Wrench,
  ShieldAlert,
  Archive,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface HardwareStatsProps {
  total: number;
  assigned: number;
  available: number;
  maintenance: number;
  warrantyExpiring: number;
  scrap: number;
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {value}
          </h2>
        </div>

        <div className="text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function HardwareStats({
  total,
  assigned,
  available,
  maintenance,
  warrantyExpiring,
  scrap,
}: HardwareStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

      <StatCard
        title="Total Assets"
        value={total}
        icon={<Monitor className="h-9 w-9" />}
      />

      <StatCard
        title="Assigned"
        value={assigned}
        icon={<CheckCircle2 className="h-9 w-9" />}
      />

      <StatCard
        title="Available"
        value={available}
        icon={<Laptop className="h-9 w-9" />}
      />

      <StatCard
        title="Maintenance"
        value={maintenance}
        icon={<Wrench className="h-9 w-9" />}
      />

      <StatCard
        title="Warranty <30 Days"
        value={warrantyExpiring}
        icon={<ShieldAlert className="h-9 w-9" />}
      />

      <StatCard
        title="Scrap"
        value={scrap}
        icon={<Archive className="h-9 w-9" />}
      />

    </div>
  );
}
