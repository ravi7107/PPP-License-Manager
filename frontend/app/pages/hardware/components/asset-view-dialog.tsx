import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  Monitor,
  User,
  Building2,
  MapPin,
  Calendar,
  ShieldCheck,
  FileText,
  HardDrive,
  Tag,
  Cpu,
} from "lucide-react";

import { AssetRecord } from "@/app/pages/hardware/types";

interface AssetViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Allocated":
      return "default";

    case "Maintenance":
      return "secondary";

    case "Scrap":
      return "destructive";

    default:
      return "outline";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return value.slice(0, 10);
}

function daysBetween(date: Date) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function WarrantyStatus({
  expiry,
}: {
  expiry?: string | null;
}) {
  if (!expiry) {
    return (
      <Badge variant="outline">
        Not Available
      </Badge>
    );
  }

  const expiryDate = new Date(expiry);

  const remaining = daysBetween(expiryDate);

  if (remaining < 0) {
    return (
      <Badge variant="destructive">
        Expired {Math.abs(remaining)} days ago
      </Badge>
    );
  }

  if (remaining <= 30) {
    return (
      <Badge variant="secondary">
        Expires in {remaining} days
      </Badge>
    );
  }

  return (
    <Badge>
      Active • {remaining} days left
    </Badge>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="mt-1 text-muted-foreground">
        {icon}
      </div>

      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 font-medium break-words">
          {value && value.length > 0 ? value : "—"}
        </p>
      </div>
    </div>
  );
}

export function AssetViewDialog({
  open,
  onOpenChange,
  asset,
}: AssetViewDialogProps) {
  if (!asset) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-6xl h-[90vh] p-0">

        <DialogHeader className="border-b px-6 py-5">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className="rounded-xl bg-primary/10 p-3">
                <Monitor className="h-8 w-8 text-primary" />
              </div>

              <div>

                <DialogTitle className="text-2xl">

                  {asset.asset_tag}

                </DialogTitle>

                <DialogDescription className="mt-1">

                  {asset.manufacturer} • {asset.model}

                </DialogDescription>

                <div className="mt-2 flex flex-wrap gap-2">

                  <Badge variant="outline">
                    {asset.asset_type}
                  </Badge>

                  <Badge variant={statusVariant(asset.status)}>
                    {asset.status}
                  </Badge>

                </div>

              </div>

            </div>

          </div>

        </DialogHeader>

        <ScrollArea className="h-full">

          <div className="space-y-6 p-6">

            <div className="grid gap-6 lg:grid-cols-2">

              <Card>

                <CardHeader>

                  <CardTitle className="flex items-center gap-2">

                    <HardDrive className="h-5 w-5" />

                    Asset Information

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-3">

                  <InfoField
                    icon={<Monitor size={18} />}
                    label="Computer Name"
                    value={asset.computer_name}
                  />

                  <InfoField
                    icon={<Tag size={18} />}
                    label="Host Name"
                    value={asset.host_name}
                  />

                  <InfoField
                    icon={<Cpu size={18} />}
                    label="Manufacturer"
                    value={asset.manufacturer}
                  />

                  <InfoField
                    icon={<Cpu size={18} />}
                    label="Model"
                    value={asset.model}
                  />

                  <InfoField
                    icon={<Monitor size={18} />}
                    label="Operating System"
                    value={asset.operating_system}
                  />

                  <InfoField
                    icon={<Tag size={18} />}
                    label="Serial Number"
                    value={asset.serial_number}
                  />

                </CardContent>

              </Card>

              <Card>

                <CardHeader>

                  <CardTitle className="flex items-center gap-2">

                    <User className="h-5 w-5" />

                    Assignment Details

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-3">

                  <InfoField
                    icon={<User size={18} />}
                    label="Current User"
                    value={asset.assigned_user_name}
                  />

                  <InfoField
                    icon={<Building2 size={18} />}
                    label="Department"
                    value={asset.department_name}
                  />

                  <InfoField
                    icon={<Building2 size={18} />}
                    label="Entity"
                    value={asset.entity_name}
                  />

                  <InfoField
                    icon={<Building2 size={18} />}
                    label="Client"
                    value={asset.client_name}
                  />

                  <InfoField
                    icon={<MapPin size={18} />}
                    label="Location"
                    value={asset.location}
                  />

                </CardContent>

              </Card>

              <Card>

                <CardHeader>

                  <CardTitle className="flex items-center gap-2">

                    <ShieldCheck className="h-5 w-5" />

                    Lifecycle & Warranty

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-4">

                  <InfoField
                    icon={<Calendar size={18} />}
                    label="Purchase Date"
                    value={formatDate(asset.purchase_date)}
                  />

                  <InfoField
                    icon={<Calendar size={18} />}
                    label="Warranty Expiry"
                    value={formatDate(asset.warranty_expiry)}
                  />

                  <div className="rounded-lg border p-3">

                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Warranty Health
                    </p>

                    <div className="mt-2">
                      <WarrantyStatus
                        expiry={asset.warranty_expiry}
                      />
                    </div>

                  </div>

                  <Separator />

                  <div className="rounded-lg border p-3">

                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current Status
                    </p>

                    <div className="mt-2">

                      <Badge
                        variant={statusVariant(asset.status)}
                      >
                        {asset.status}
                      </Badge>

                    </div>

                  </div>

                </CardContent>

              </Card>

              <Card>

                <CardHeader>

                  <CardTitle className="flex items-center gap-2">

                    <FileText className="h-5 w-5" />

                    Audit Information

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-3">

                  <InfoField
                    icon={<User size={18} />}
                    label="Created By"
                    value={asset.created_by}
                  />

                  <InfoField
                    icon={<User size={18} />}
                    label="Last Updated By"
                    value={asset.updated_by}
                  />

                  <InfoField
                    icon={<Calendar size={18} />}
                    label="Last Updated"
                    value={
                      asset.updated_at
                        ?.slice(0, 19)
                        .replace("T", " ")
                    }
                  />

                </CardContent>

              </Card>

            </div>

            <Card>

              <CardHeader>

                <CardTitle>

                  Remarks

                </CardTitle>

              </CardHeader>

              <CardContent>

                <div className="rounded-lg border bg-muted/20 p-4 min-h-[120px] whitespace-pre-wrap break-words">

                  {asset.remarks && asset.remarks.length > 0
                    ? asset.remarks
                    : "No remarks available."}

                </div>

              </CardContent>

            </Card>

          </div>

        </ScrollArea>

      </DialogContent>

    </Dialog>

  );
}
