import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Calendar,
  ShieldCheck,
  HardDrive,
  Tag,
  Cpu,
  MapPin,
  QrCode,
  FileText,
} from "lucide-react";

import { AssetRecord } from "@/app/pages/hardware/types";
import { downloadAssetQrLabel } from "@/lib/api/assets.api";

type ViewableAssetRecord = AssetRecord & {
  assignedUserName?: string | null;
  currentSeatLabel?: string | null;
};

interface AssetViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: ViewableAssetRecord | null;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Assigned":
      return "default";

    case "Maintenance":
    case "Reserved":
      return "secondary";

    case "Retired":
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

// Phase 8 - invoice-status summary for the "Sourced from PR" card below.
// "No Invoice" isn't necessarily a problem (material may not have arrived/
// been billed yet) - this is informational, not a warning by default.
function InvoiceStatusBadge({
  count,
  total,
}: {
  count?: number;
  total?: number;
}) {
  if (!count || count === 0) {
    return <Badge variant="outline">No Invoice</Badge>;
  }

  return (
    <Badge>
      {count} Invoice{count === 1 ? "" : "s"}
      {total != null ? ` • ${total.toFixed(2)}` : ""}
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
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!asset) return null;

  const handlePrintQrLabel = async () => {
    setDownloadingLabel(true);
    setLabelError(null);

    try {
      const { blob, fileName } = await downloadAssetQrLabel(asset.id);
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setLabelError("Could not generate the QR label. Please try again.");
    } finally {
      setDownloadingLabel(false);
    }
  };

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

                  {asset.assetTag}

                </DialogTitle>

                <DialogDescription className="mt-1">

                  {asset.manufacturer} • {asset.model}

                </DialogDescription>

                <div className="mt-2 flex flex-wrap gap-2">

                  <Badge variant="outline">
                    {asset.assetType}
                  </Badge>

                  <Badge variant={statusVariant(asset.status)}>
                    {asset.status}
                  </Badge>

                </div>

              </div>

            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handlePrintQrLabel()}
              disabled={downloadingLabel}
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              {downloadingLabel ? "Generating…" : "Print QR Label"}
            </Button>

          </div>

          {labelError && (
            <p className="mt-2 text-sm text-destructive">{labelError}</p>
          )}

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
                    icon={<Tag size={18} />}
                    label="Host Name"
                    value={asset.hostName}
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
                    value={asset.operatingSystem}
                  />

                  <InfoField
                    icon={<Tag size={18} />}
                    label="Serial Number"
                    value={asset.serialNumber}
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
                    value={asset.assignedUserName}
                  />

                  <InfoField
                    icon={<Building2 size={18} />}
                    label="Department"
                    value={asset.departmentName}
                  />

                  <InfoField
                    icon={<MapPin size={18} />}
                    label="Seat (Office Floor Map)"
                    value={asset.currentSeatLabel}
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
                    value={formatDate(asset.purchaseDate)}
                  />

                  <InfoField
                    icon={<Calendar size={18} />}
                    label="Warranty Expiry"
                    value={formatDate(asset.warrantyExpiry)}
                  />

                  <div className="rounded-lg border p-3">

                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Warranty Health
                    </p>

                    <div className="mt-2">
                      <WarrantyStatus
                        expiry={asset.warrantyExpiry}
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

              {/* Phase 8 - "Sourced from PR" - hidden entirely when this
                  asset wasn't created linked to a Purchase Requisition
                  (the normal case, since linking is always optional). */}

              {asset.purchaseRequisitionId ? (
                <Card>

                  <CardHeader>

                    <CardTitle className="flex items-center gap-2">

                      <FileText className="h-5 w-5" />

                      Sourced from PR

                    </CardTitle>

                  </CardHeader>

                  <CardContent className="space-y-3">

                    <InfoField
                      icon={<Tag size={18} />}
                      label="PR Number"
                      value={asset.prNumber}
                    />

                    <InfoField
                      icon={<Tag size={18} />}
                      label="PO Number"
                      value={asset.poNumber}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <InfoField
                        icon={<Calendar size={18} />}
                        label="PO Date"
                        value={formatDate(asset.poDate)}
                      />

                      <InfoField
                        icon={<Calendar size={18} />}
                        label="PO Amount"
                        value={
                          asset.poAmount != null
                            ? asset.poAmount.toFixed(2)
                            : undefined
                        }
                      />
                    </div>

                    <div className="rounded-lg border p-3">

                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Invoicing
                      </p>

                      <div className="mt-2">
                        <InvoiceStatusBadge
                          count={asset.invoiceCount}
                          total={asset.totalInvoiceAmount}
                        />
                      </div>

                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        navigate(
                          `/purchase-requisitions?prId=${asset.purchaseRequisitionId}`
                        )
                      }
                    >
                      View Purchase Requisition
                    </Button>

                  </CardContent>

                </Card>
              ) : null}

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
