import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ResourceAllocation } from "@/lib/api/resource-allocations.api";
import type { User } from "@/lib/api/users.api";
import type { Asset } from "@/lib/api/assets.api";

export interface ResourceTransferValues {
  newUserId: number;
  newAssetId: number | null;
  expectedReturnDate: string | null;
  remarks: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ResourceAllocation | null;
  users: User[];
  assets: Asset[];
  saving: boolean;
  onSubmit: (values: ResourceTransferValues) => Promise<void>;
}

export function ResourceAllocationTransferDialog({
  open,
  onOpenChange,
  allocation,
  users,
  assets,
  saving,
  onSubmit,
}: Props) {
  const [newUserId, setNewUserId] = useState("");
  const [newAssetId, setNewAssetId] = useState("none");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setNewUserId("");
      setNewAssetId("none");
      setExpectedReturnDate("");
      setRemarks("");
    }
  }, [open, allocation?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!newUserId) {
      return;
    }

    await onSubmit({
      newUserId: Number(newUserId),
      newAssetId:
        newAssetId === "none"
          ? null
          : Number(newAssetId),
      expectedReturnDate: expectedReturnDate
        ? `${expectedReturnDate}T00:00:00Z`
        : null,
      remarks: remarks.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer License</DialogTitle>

          <DialogDescription>
            Transfer {allocation?.licenseAliasCode || "this license"} from{" "}
            {allocation?.userName || "the current employee"} to another employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Employee</Label>

            <Input
              value={allocation?.userName || ""}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Transfer To *</Label>

            <Select
              value={newUserId}
              onValueChange={setNewUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent>
                {users
                  .filter(
                    (user) =>
                      user.isActive &&
                      user.id !== allocation?.userId
                  )
                  .map((user) => (
                    <SelectItem
                      key={user.id}
                      value={String(user.id)}
                    >
                      {user.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Asset / Computer</Label>

            <Select
              value={newAssetId}
              onValueChange={setNewAssetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional asset" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">
                  No Asset
                </SelectItem>

                {assets
                  .filter((asset) => asset.isActive)
                  .map((asset) => (
                    <SelectItem
                      key={asset.id}
                      value={String(asset.id)}
                    >
                      {asset.assetName || asset.assetTag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expected Return Date</Label>

            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) =>
                setExpectedReturnDate(e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Transfer Reason / Remarks</Label>

            <Input
              value={remarks}
              maxLength={500}
              placeholder="Example: Required for new project"
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving || !newUserId}
            >
              {saving ? "Transferring..." : "Transfer License"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
