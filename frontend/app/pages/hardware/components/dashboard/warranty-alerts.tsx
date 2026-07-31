import {
  ShieldAlert,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

interface WarrantyAsset {
  id: number;
  asset_tag: string;
  computer_name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  warranty_expiry?: string | null;
}

interface WarrantyAlertsProps {
  assets: WarrantyAsset[];
}

function getDaysRemaining(date?: string | null) {
  if (!date) return null;

  const today = new Date();

  const expiry = new Date(date);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export function WarrantyAlerts({
  assets,
}: WarrantyAlertsProps) {

  const expiring = assets
    .filter((asset) => {
      const days = getDaysRemaining(asset.warranty_expiry);

      return days !== null && days >= 0 && days <= 30;
    })
    .sort(
      (a, b) =>
        getDaysRemaining(a.warranty_expiry)! -
        getDaysRemaining(b.warranty_expiry)!
    );

  const expired = assets
    .filter((asset) => {
      const days = getDaysRemaining(asset.warranty_expiry);

      return days !== null && days < 0;
    })
    .sort(
      (a, b) =>
        getDaysRemaining(b.warranty_expiry)! -
        getDaysRemaining(a.warranty_expiry)!
    );

  return (
    <div className="grid gap-4 lg:grid-cols-2">

      <Card>

        <CardHeader>

          <CardTitle className="flex items-center gap-2">

            <ShieldAlert className="h-5 w-5 text-orange-500" />

            Warranty Expiring

          </CardTitle>

          <CardDescription>

            Assets expiring within the next 30 days

          </CardDescription>

        </CardHeader>

        <CardContent className="space-y-3">

          {expiring.length === 0 && (

            <div className="text-sm text-muted-foreground">

              No assets nearing warranty expiry.

            </div>

          )}

          {expiring.map((asset) => {

            const days = getDaysRemaining(asset.warranty_expiry);

            return (

              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >

                <div>

                  <div className="font-medium">

                    {asset.asset_tag}

                  </div>

                  <div className="text-sm text-muted-foreground">

                    {asset.manufacturer} {asset.model}

                  </div>

                </div>

                <Badge variant="secondary">

                  <CalendarClock className="mr-1 h-3 w-3" />

                  {days} Days

                </Badge>

              </div>

            );

          })}

        </CardContent>

      </Card>

      <Card>

        <CardHeader>

          <CardTitle className="flex items-center gap-2">

            <ShieldCheck className="h-5 w-5 text-red-500" />

            Expired Warranty

          </CardTitle>

          <CardDescription>

            Assets requiring renewal or replacement

          </CardDescription>

        </CardHeader>

        <CardContent className="space-y-3">

          {expired.length === 0 && (

            <div className="text-sm text-muted-foreground">

              No expired warranties.

            </div>

          )}

          {expired.map((asset) => {

            const days = Math.abs(
              getDaysRemaining(asset.warranty_expiry)!
            );

            return (

              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >

                <div>

                  <div className="font-medium">

                    {asset.asset_tag}

                  </div>

                  <div className="text-sm text-muted-foreground">

                    {asset.manufacturer} {asset.model}

                  </div>

                </div>

                <Badge variant="destructive">

                  {days} Days Ago

                </Badge>

              </div>

            );

          })}

        </CardContent>

      </Card>

    </div>
  );
}
