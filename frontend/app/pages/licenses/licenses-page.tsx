import { FormEvent, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  KeySquare,
  PackageCheck,
  PackageOpen,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/layout/kpi-card";
import { AppRole, canManage } from "@/lib/auth/roles";

import {
  Software,
  CreateSoftwareRequest,
  getSoftware,
  createSoftware,
  updateSoftware,
} from "@/lib/api/software.api";

import {
  License,
  CreateLicenseRequest,
  UpdateLicenseRequest,
  getLicenses,
  createLicense,
  updateLicense,
  deleteLicense,
} from "@/lib/api/licenses.api";

type SoftwareFormState = {
  name: string;
  version: string;
  vendor: string;
  category: string;
  licenseType: string;
  isLicenseRequired: boolean;
  description: string;
};

type LicenseFormState = {
  aliasCode: string;
  softwareId: string;
  licensedEmail: string;
  subscriptionId: string;
  status: string;
  allowTemporaryCheckout: boolean;
  maxCheckoutDays: string;
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: string;
  isActive: boolean;
  remarks: string;
};

const EMPTY_SOFTWARE: SoftwareFormState = {
  name: "",
  version: "",
  vendor: "",
  category: "Engineering",
  licenseType: "Subscription",
  isLicenseRequired: true,
  description: "",
};

const EMPTY_LICENSE: LicenseFormState = {
  aliasCode: "",
  softwareId: "",
  licensedEmail: "",
  subscriptionId: "",
  status: "Available",
  allowTemporaryCheckout: true,
  maxCheckoutDays: "5",
  purchaseDate: "",
  expiryDate: "",
  purchaseCost: "0",
  isActive: true,
  remarks: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toLocaleDateString("en-IN");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function licenseStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toLowerCase();

  if (normalized === "available") return "default";
  if (normalized === "expired") return "destructive";
  if (normalized === "allocated" || normalized === "assigned") {
    return "secondary";
  }

  return "outline";
}

export default function LicensesPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const canEdit = canManage(roles);

  const [software, setSoftware] = useState<Software[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [softwareDialogOpen, setSoftwareDialogOpen] = useState(false);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);

  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  const [softwareForm, setSoftwareForm] =
    useState<SoftwareFormState>(EMPTY_SOFTWARE);

  const [licenseForm, setLicenseForm] =
    useState<LicenseFormState>(EMPTY_LICENSE);

  const [savingSoftware, setSavingSoftware] = useState(false);
  const [savingLicense, setSavingLicense] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [softwareData, licenseData] = await Promise.all([
        getSoftware(),
        getLicenses(),
      ]);

      setSoftware(softwareData);
      setLicenses(licenseData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load software and license information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const activeLicenses = licenses.filter((x) => x.isActive);

    const available = activeLicenses.filter(
      (x) => x.status.toLowerCase() === "available"
    ).length;

    const expired = activeLicenses.filter(
      (x) =>
        x.status.toLowerCase() === "expired" ||
        new Date(x.expiryDate) < now
    ).length;

    const expiringSoon = activeLicenses.filter((x) => {
      const expiry = new Date(x.expiryDate);

      return expiry >= now && expiry <= next30Days;
    }).length;

    const totalCost = activeLicenses.reduce(
      (sum, item) => sum + Number(item.purchaseCost || 0),
      0
    );

    return {
      softwareTitles: software.filter((x) => x.isActive).length,
      totalLicenses: activeLicenses.length,
      available,
      allocated: Math.max(activeLicenses.length - available - expired, 0),
      expiringSoon,
      totalCost,
    };
  }, [software, licenses]);

  const filteredLicenses = useMemo(() => {
    let result = [...licenses];

    if (statusFilter !== "all") {
      result = result.filter(
        (x) => x.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      result = result.filter((x) =>
        [
          x.aliasCode,
          x.softwareName,
          x.licensedEmail,
          x.subscriptionId || "",
          x.status,
        ].some((value) => value.toLowerCase().includes(q))
      );
    }

    return result;
  }, [licenses, search, statusFilter]);

  function openAddSoftware() {
    setEditingSoftware(null);
    setSoftwareForm(EMPTY_SOFTWARE);
    setSoftwareDialogOpen(true);
  }

  function openEditSoftware(item: Software) {
    setEditingSoftware(item);

    setSoftwareForm({
      name: item.name,
      version: item.version || "",
      vendor: item.vendor,
      category: item.category,
      licenseType: item.licenseType,
      isLicenseRequired: item.isLicenseRequired,
      description: item.description || "",
    });

    setSoftwareDialogOpen(true);
  }

  function openAddLicense() {
    setEditingLicense(null);

    setLicenseForm({
      ...EMPTY_LICENSE,
      softwareId: software.length > 0 ? String(software[0].id) : "",
    });

    setLicenseDialogOpen(true);
  }

  function openEditLicense(item: License) {
    setEditingLicense(item);

    setLicenseForm({
      aliasCode: item.aliasCode,
      softwareId: String(item.softwareId),
      licensedEmail: item.licensedEmail,
      subscriptionId: item.subscriptionId || "",
      status: item.status || "Available",
      allowTemporaryCheckout: item.allowTemporaryCheckout,
      maxCheckoutDays: String(item.maxCheckoutDays),
      purchaseDate: item.purchaseDate?.slice(0, 10) || "",
      expiryDate: item.expiryDate?.slice(0, 10) || "",
      purchaseCost: String(item.purchaseCost),
      isActive: item.isActive,
      remarks: item.remarks || "",
    });

    setLicenseDialogOpen(true);
  }

  async function handleSoftwareSubmit(e: FormEvent) {
    e.preventDefault();

    setSavingSoftware(true);
    setError("");

    try {
      const payload: CreateSoftwareRequest = {
        name: softwareForm.name.trim(),
        version: softwareForm.version.trim() || null,
        vendor: softwareForm.vendor.trim(),
        category: softwareForm.category.trim(),
        licenseType: softwareForm.licenseType,
        isLicenseRequired: softwareForm.isLicenseRequired,
        description: softwareForm.description.trim() || null,
      };

      if (editingSoftware) {
        await updateSoftware(editingSoftware.id, {
          ...payload,
          isActive: editingSoftware.isActive,
        });
      } else {
        await createSoftware(payload);
      }

      setSoftwareDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save software."
      );
    } finally {
      setSavingSoftware(false);
    }
  }

  async function handleLicenseSubmit(e: FormEvent) {
    e.preventDefault();

    setSavingLicense(true);
    setError("");

    try {
      if (!licenseForm.softwareId) {
        setError("Please select software.");
        return;
      }

      const basePayload = {
        aliasCode: licenseForm.aliasCode.trim(),
        softwareId: Number(licenseForm.softwareId),
        licensedEmail: licenseForm.licensedEmail.trim(),
        subscriptionId: licenseForm.subscriptionId.trim() || null,
        allowTemporaryCheckout: licenseForm.allowTemporaryCheckout,
        maxCheckoutDays: Number(licenseForm.maxCheckoutDays),
        purchaseDate: licenseForm.purchaseDate,
        expiryDate: licenseForm.expiryDate,
        purchaseCost: Number(licenseForm.purchaseCost),
        remarks: licenseForm.remarks.trim() || null,
      };

      if (editingLicense) {
        const payload: UpdateLicenseRequest = {
          ...basePayload,
          status: licenseForm.status,
          isActive: licenseForm.isActive,
        };

        await updateLicense(editingLicense.id, payload);
      } else {
        const payload: CreateLicenseRequest = basePayload;
        await createLicense(payload);
      }

      setLicenseDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save license."
      );
    } finally {
      setSavingLicense(false);
    }
  }

  async function handleDeleteLicense(item: License) {
    const confirmed = window.confirm(
      `Delete license ${item.aliasCode}?`
    );

    if (!confirmed) return;

    try {
      await deleteLicense(item.id);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete license."
      );
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Software Titles"
          value={stats.softwareTitles}
          icon={KeySquare}
          hint="Active software products"
        />

        <KpiCard
          title="Total Licenses"
          value={stats.totalLicenses}
          icon={PackageCheck}
          hint="Individual licenses tracked"
        />

        <KpiCard
          title="Available"
          value={stats.available}
          icon={PackageOpen}
          hint="Available for allocation"
        />

        <KpiCard
          title="Allocated"
          value={stats.allocated}
          icon={PackageCheck}
          hint="Currently in use"
        />

        <KpiCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          tone="warning"
          hint="Expiry within 30 days"
        />

        <KpiCard
          title="Total Cost"
          value={formatCurrency(stats.totalCost)}
          icon={DollarSign}
          hint="Purchase cost of active licenses"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Software Titles</CardTitle>
            <CardDescription>
              Manage software products available for licensing.
            </CardDescription>
          </div>

          {canEdit ? (
            <Button size="sm" onClick={openAddSoftware}>
              <Plus className="mr-2 h-4 w-4" />
              Add Software
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Software</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>License Type</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : software.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No software configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  software.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>{item.vendor}</TableCell>
                      <TableCell>{item.version || "—"}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.licenseType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.isActive ? "default" : "secondary"
                          }
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSoftware(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>License Inventory</CardTitle>
              <CardDescription>
                Track individual licenses, subscriptions, cost and expiry.
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              {canEdit ? (
                <Button
                  size="sm"
                  onClick={openAddLicense}
                  disabled={software.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add License
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-8"
                placeholder="Search license, software, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Allocated">Allocated</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <span className="self-center text-sm text-muted-foreground">
              {filteredLicenses.length} license(s)
            </span>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead>Software</TableHead>
                  <TableHead>Licensed Email</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Cost</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading licenses…
                    </TableCell>
                  </TableRow>
                ) : filteredLicenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No licenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLicenses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.aliasCode}
                      </TableCell>
                      <TableCell>{item.softwareName}</TableCell>
                      <TableCell>{item.licensedEmail}</TableCell>
                      <TableCell>
                        {item.subscriptionId || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={licenseStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(item.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        {formatDate(item.expiryDate)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(item.purchaseCost))}
                      </TableCell>

                      {canEdit ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditLicense(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLicense(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={softwareDialogOpen}
        onOpenChange={setSoftwareDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSoftware ? "Edit Software" : "Add Software"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSoftwareSubmit}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Software Name</label>
              <Input
                value={softwareForm.name}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input
                value={softwareForm.vendor}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    vendor: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Version</label>
              <Input
                value={softwareForm.version}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    version: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={softwareForm.category}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    category: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">License Type</label>

              <Select
                value={softwareForm.licenseType}
                onValueChange={(value) =>
                  setSoftwareForm({
                    ...softwareForm,
                    licenseType: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Subscription">
                    Subscription
                  </SelectItem>
                  <SelectItem value="Perpetual">
                    Perpetual
                  </SelectItem>
                  <SelectItem value="Floating">
                    Floating
                  </SelectItem>
                  <SelectItem value="Node-locked">
                    Node-locked
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={softwareForm.description}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={softwareForm.isLicenseRequired}
                onChange={(e) =>
                  setSoftwareForm({
                    ...softwareForm,
                    isLicenseRequired: e.target.checked,
                  })
                }
              />
              License required
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSoftwareDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={savingSoftware}>
                {savingSoftware
                  ? "Saving..."
                  : editingSoftware
                    ? "Update Software"
                    : "Create Software"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={licenseDialogOpen}
        onOpenChange={setLicenseDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingLicense ? "Edit License" : "Add License"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleLicenseSubmit}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Alias Code</label>
              <Input
                placeholder="Example: ACAD-001"
                value={licenseForm.aliasCode}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    aliasCode: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Software</label>

              <Select
                value={licenseForm.softwareId}
                onValueChange={(value) =>
                  setLicenseForm({
                    ...licenseForm,
                    softwareId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select software" />
                </SelectTrigger>

                <SelectContent>
                  {software
                    .filter((x) => x.isActive)
                    .map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.name}
                        {item.version ? ` ${item.version}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Licensed Email
              </label>
              <Input
                type="email"
                value={licenseForm.licensedEmail}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    licensedEmail: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Subscription ID
              </label>
              <Input
                value={licenseForm.subscriptionId}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    subscriptionId: e.target.value,
                  })
                }
              />
            </div>

            {editingLicense ? (
              <div>
                <label className="text-sm font-medium">Status</label>

                <Select
                  value={licenseForm.status}
                  onValueChange={(value) =>
                    setLicenseForm({
                      ...licenseForm,
                      status: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Available">
                      Available
                    </SelectItem>
                    <SelectItem value="Allocated">
                      Allocated
                    </SelectItem>
                    <SelectItem value="Expired">
                      Expired
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">
                  Purchase Date
                </label>
                <Input
                  type="date"
                  value={licenseForm.purchaseDate}
                  onChange={(e) =>
                    setLicenseForm({
                      ...licenseForm,
                      purchaseDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={licenseForm.expiryDate}
                  onChange={(e) =>
                    setLicenseForm({
                      ...licenseForm,
                      expiryDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Purchase Cost (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={licenseForm.purchaseCost}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    purchaseCost: e.target.value,
                  })
                }
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={licenseForm.allowTemporaryCheckout}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    allowTemporaryCheckout: e.target.checked,
                  })
                }
              />
              Allow temporary checkout
            </label>

            {licenseForm.allowTemporaryCheckout ? (
              <div>
                <label className="text-sm font-medium">
                  Maximum Checkout Days
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={licenseForm.maxCheckoutDays}
                  onChange={(e) =>
                    setLicenseForm({
                      ...licenseForm,
                      maxCheckoutDays: e.target.value,
                    })
                  }
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="text-sm font-medium">Remarks</label>
              <Input
                value={licenseForm.remarks}
                onChange={(e) =>
                  setLicenseForm({
                    ...licenseForm,
                    remarks: e.target.value,
                  })
                }
              />
            </div>

            {editingLicense ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={licenseForm.isActive}
                  onChange={(e) =>
                    setLicenseForm({
                      ...licenseForm,
                      isActive: e.target.checked,
                    })
                  }
                />
                Active license
              </label>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLicenseDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={savingLicense}>
                {savingLicense
                  ? "Saving..."
                  : editingLicense
                    ? "Update License"
                    : "Create License"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
