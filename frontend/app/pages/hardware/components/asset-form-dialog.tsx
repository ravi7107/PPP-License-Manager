import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AssetFormValues,
  AssetRecord,
  AssetType,
  EMPTY_ASSET_FORM,
  LookupOption,
} from "@/app/pages/hardware/types";

interface VendorOption {
  id: number;
  vendorName: string;
}

const assetFormSchema = z.object({
  assetTag: z.string().min(1, "Asset ID is required"),

  assetName: z.string().min(1, "Asset Name is required"),

  assetType: z.enum([
    "Desktop",
    "Laptop",
    "Workstation",
    "Server",
  ]),

  manufacturer: z.string().default(""),

  model: z.string().default(""),

  serialNumber: z.string().default(""),

  hostName: z.string().default(""),

  processor: z.string().default(""),

  ramGb: z.coerce.number().optional(),

  purchaseDate: z.string().default(""),

  warrantyExpiry: z.string().default(""),

  operatingSystem: z.string().default(""),

  status: z.enum([
    "Available",
    "Assigned",
    "Maintenance",
    "Reserved",
    "Retired",
  ]),

  remarks: z.string().default(""),

  departmentId: z.string().default(""),

  ownershipType: z.enum(["Owned", "Rented"]).default("Owned"),

  vendorId: z.string().default(""),

  rentalStartDate: z.string().default(""),

  rentalEndDate: z.string().default(""),

  dualMonitor: z.boolean().default(false),
});

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  asset: AssetRecord | null;

  isAssigned?: boolean;

  departments: LookupOption[];

  vendors: VendorOption[];

  saving: boolean;

  onSubmit: (values: AssetFormValues) => Promise<void>;

  error?: string | null;
}

/*
 * Backend DTOs use different property names:
 *
 * UserResponse:
 *   Id
 *   FullName
 *
 * DepartmentResponse:
 *   Id
 *   DepartmentName
 *
 * Company / Client:
 *   Id
 *   Name
 *
 * Depending on the frontend LookupOption definition,
 * TypeScript may not know all these properties.
 *
 * This local type lets us safely handle the actual API
 * response without changing the global LookupOption type.
 */
type LookupItem = LookupOption & {
  id: number | string;
  name?: string;
  fullName?: string;
  departmentName?: string;
  companyName?: string;
};

function toFormValues(
  asset: AssetRecord | null
): AssetFormValues {
  if (!asset) {
    return {
      ...EMPTY_ASSET_FORM,
      hostName: EMPTY_ASSET_FORM.hostName ?? "",
      manufacturer: EMPTY_ASSET_FORM.manufacturer ?? "",
      model: EMPTY_ASSET_FORM.model ?? "",
      serialNumber: EMPTY_ASSET_FORM.serialNumber ?? "",
      processor: EMPTY_ASSET_FORM.processor ?? "",
      purchaseDate: EMPTY_ASSET_FORM.purchaseDate ?? "",
      warrantyExpiry: EMPTY_ASSET_FORM.warrantyExpiry ?? "",
      operatingSystem: EMPTY_ASSET_FORM.operatingSystem ?? "",
      remarks: EMPTY_ASSET_FORM.remarks ?? "",
      departmentId: EMPTY_ASSET_FORM.departmentId ?? "",
      ownershipType: EMPTY_ASSET_FORM.ownershipType,
      vendorId: EMPTY_ASSET_FORM.vendorId ?? "",
      rentalStartDate: EMPTY_ASSET_FORM.rentalStartDate ?? "",
      rentalEndDate: EMPTY_ASSET_FORM.rentalEndDate ?? "",
      dualMonitor: EMPTY_ASSET_FORM.dualMonitor ?? false,
    };
  }

  return {
    assetTag: asset.assetTag ?? "",
    assetName: asset.assetName ?? "",

    assetType:
      (asset.assetType as AssetType) ?? "Workstation",

    hostName: asset.hostName ?? "",

    manufacturer: asset.manufacturer ?? "",

    model: asset.model ?? "",

    serialNumber: asset.serialNumber ?? "",

    processor: asset.processor ?? "",

    ramGb: asset.ramGb ?? undefined,

    purchaseDate: asset.purchaseDate
      ? asset.purchaseDate.slice(0, 10)
      : "",

    warrantyExpiry: asset.warrantyExpiry
      ? asset.warrantyExpiry.slice(0, 10)
      : "",

    operatingSystem: asset.operatingSystem ?? "",

    status:
      (asset.status as AssetFormValues["status"]) ??
      "Available",

    remarks: asset.remarks ?? "",

    departmentId: asset.departmentId
      ? String(asset.departmentId)
      : "",

    ownershipType: asset.ownershipType ?? "Owned",

    vendorId: asset.vendorId ? String(asset.vendorId) : "",

    rentalStartDate: asset.rentalStartDate
      ? asset.rentalStartDate.slice(0, 10)
      : "",

    rentalEndDate: asset.rentalEndDate
      ? asset.rentalEndDate.slice(0, 10)
      : "",

    dualMonitor: asset.dualMonitor ?? false,
  };
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  isAssigned = false,
  departments,
  vendors,
  saving,
  onSubmit,
  error,
}: AssetFormDialogProps) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: toFormValues(null),
  });

  const ownershipType = form.watch("ownershipType");

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(asset));
    }
  }, [open, asset, form]);

  const isEditing = Boolean(asset);

  /*
   * Protect the UI if the API returns an unexpected response.
   * This prevents:
   *
   * departments.map is not a function
   *
   * from crashing the whole page.
   */
  const safeDepartments: LookupItem[] = Array.isArray(
    departments
  )
    ? (departments as LookupItem[])
    : [];

  const safeVendors: VendorOption[] = Array.isArray(vendors)
    ? vendors
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[850px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Asset" : "Add Asset"}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? "Update the asset information below."
              : "Enter the asset information below to create a new asset."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* BASIC INFORMATION */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="assetTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset ID *</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="AST-0001"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name *</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Dell Latitude 5420"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type *</FormLabel>

                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="Desktop">
                            Desktop
                          </SelectItem>

                          <SelectItem value="Laptop">
                            Laptop
                          </SelectItem>

                          <SelectItem value="Workstation">
                            Workstation
                          </SelectItem>

                          <SelectItem value="Server">
                            Server
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>

                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={isAssigned}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="Available">
                            Available
                          </SelectItem>

                          <SelectItem value="Assigned">
                            Assigned
                          </SelectItem>

                          <SelectItem value="Maintenance">
                            Maintenance
                          </SelectItem>

                          <SelectItem value="Reserved">
                            Reserved
                          </SelectItem>

                          <SelectItem value="Retired">
                            Retired
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {isAssigned ? (
                        <p className="text-xs text-muted-foreground">
                          This asset is currently allocated to a user, so
                          its status is managed from the Allocate /
                          Reassign / Return actions.
                        </p>
                      ) : null}

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* HARDWARE INFORMATION */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Hardware Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Dell"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Latitude 5420"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Serial number"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hostName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host Name</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="PPS-LT-001"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processor</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Intel Core i5"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ramGb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RAM (GB)</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          placeholder="16"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value =
                              e.target.value;

                            field.onChange(
                              value === ""
                                ? undefined
                                : Number(value)
                            );
                          }}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operatingSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operating System</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Windows 11 Pro"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* DEPARTMENT */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Department
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>

                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {safeDepartments.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">
                              No departments available
                            </div>
                          ) : (
                            safeDepartments.map((d) => (
                              <SelectItem
                                key={d.id}
                                value={String(d.id)}
                              >
                                {d.departmentName ??
                                  d.name ??
                                  "Unnamed Department"}
                                {d.companyName
                                  ? ` (${d.companyName})`
                                  : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                To assign this asset to a user, save it first, then use
                the &quot;Allocate&quot; action from the asset list.
              </p>
            </div>

            {/* OWNERSHIP / RENTAL */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Ownership
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ownershipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership *</FormLabel>

                      <Select
                        value={field.value ?? "Owned"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ownership" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="Owned">
                            Owned
                          </SelectItem>

                          <SelectItem value="Rented">
                            Rented
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {ownershipType === "Rented" ? (
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Vendor</FormLabel>

                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {safeVendors.length === 0 ? (
                              <div className="px-2 py-3 text-sm text-muted-foreground">
                                No vendors available
                              </div>
                            ) : (
                              safeVendors.map((v) => (
                                <SelectItem
                                  key={v.id}
                                  value={String(v.id)}
                                >
                                  {v.vendorName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {ownershipType === "Rented" ? (
                  <FormField
                    control={form.control}
                    name="rentalStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Start Date</FormLabel>

                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {ownershipType === "Rented" ? (
                  <FormField
                    control={form.control}
                    name="rentalEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental End Date</FormLabel>

                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              {ownershipType === "Rented" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  This asset will be tracked as rented - vendor and rental
                  dates below are optional and can be filled in later.
                </p>
              ) : null}
            </div>

            {/* SETUP */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Setup
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dualMonitor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dual Monitor</FormLabel>

                      <Select
                        value={field.value ? "yes" : "no"}
                        onValueChange={(v) => field.onChange(v === "yes")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* PURCHASE / WARRANTY */}

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Purchase & Warranty
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warrantyExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Expiry</FormLabel>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* REMARKS */}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>

                  <FormControl>
                    <textarea
                      className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Additional remarks..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ACTIONS */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Asset"
                    : "Create Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
