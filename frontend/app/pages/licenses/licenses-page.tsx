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
  Download,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import {
  LicensePurchase,
  CreateLicensePurchaseRequest,
  UpdateLicensePurchaseRequest,
  getLicensePurchases,
  createLicensePurchase,
  updateLicensePurchase,
} from "@/lib/api/license-purchases.api";

import { LicenseImportDialog, LicenseImportResult } from "@/app/pages/licenses/components/license-import-dialog";
import {
  exportLicensesToExcel,
  ImportedLicenseRow,
  resolveImportedAllowCheckout,
  resolveImportedMaxCheckoutDays,
  resolveImportedPurchaseCost,
} from "@/lib/utils/license-excel";

import {
  Client,
  getClients,
} from "@/lib/api/clients.api";

import {
  Department,
  getDepartments,
} from "@/lib/api/departments.api";

import {
  Company,
  getCompanies,
} from "@/lib/api/companies.api";

type SoftwareFormState = {
  name: string;
  version: string;
  vendor: string;
  category: string;
  licenseType: string;
  isLicenseRequired: boolean;
  description: string;
};

type PurchaseFormState = {
  softwareId: string;
  vendor: string;
  licenseType: string;
  licenseKey: string;
  totalLicenses: string;
  purchaseDate: string;
  expiryDate: string;
  supportExpiryDate: string;
  companyId: string;
  departmentId: string;
  clientId: string;
  purchasedByType: string;
  purchaseScope: string;
  poNumber: string;
  invoiceNumber: string;
  contractNumber: string;
  cost: string;
  currency: string;
  purchaseSource: string;
  remarks: string;
  isActive: boolean;
};

const emptyPurchaseForm: PurchaseFormState = {
  softwareId: "",
  vendor: "",
  licenseType: "",
  licenseKey: "",
  totalLicenses: "1",
  purchaseDate: "",
  expiryDate: "",
  supportExpiryDate: "",
  companyId: "",
  departmentId: "",
  clientId: "",
  purchasedByType: "Entity",
  purchaseScope: "Organization",
  poNumber: "",
  invoiceNumber: "",
  contractNumber: "",
  cost: "",
  currency: "INR",
  purchaseSource: "",
  remarks: "",
  isActive: true,
};

type LicenseFormState = {
  aliasCode: string;
  softwareId: string;
  licensePurchaseId: string;
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
  licensePurchaseId: "",
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

function licenseStatusPillClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "available") return "nova-pill nova-pill-success";
  if (normalized === "expired") return "nova-pill nova-pill-danger";
  if (normalized === "allocated" || normalized === "assigned") {
    return "nova-pill nova-pill-info";
  }

  return "nova-pill nova-pill-neutral";
}

export default function LicensesPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const canEdit = canManage(roles);

  const [software, setSoftware] = useState<Software[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensePurchases, setLicensePurchases] =
    useState<LicensePurchase[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [purchaseDialogOpen, setPurchaseDialogOpen] =
    useState(false);

  const [editingPurchase, setEditingPurchase] =
    useState<LicensePurchase | null>(null);

  const [purchaseForm, setPurchaseForm] =
    useState<PurchaseFormState>({ ...emptyPurchaseForm });

  const [savingPurchase, setSavingPurchase] =
    useState(false);

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

  const [licenseImportOpen, setLicenseImportOpen] = useState(false);
  const [importingLicenses, setImportingLicenses] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        softwareData,
        licenseData,
        licensePurchaseData,
        companyData,
        clientData,
        departmentData,
      ] = await Promise.all([
        getSoftware(),
        getLicenses(),
        getLicensePurchases(),
        getCompanies(),
        getClients(),
        getDepartments(),
      ]);

      setSoftware(softwareData);
      setLicenses(licenseData);
      setLicensePurchases(licensePurchaseData);
      setCompanies(companyData);
      setClients(clientData);
      setDepartments(departmentData);
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

  function openAddPurchase() {
    setEditingPurchase(null);

    setPurchaseForm({
      ...emptyPurchaseForm,
      softwareId:
        software.find((x) => x.isActive)?.id?.toString() || "",
    });

    setPurchaseDialogOpen(true);
  }

  function openEditPurchase(item: LicensePurchase) {
    setEditingPurchase(item);

    setPurchaseForm({
      softwareId: String(item.softwareId),
      vendor: item.vendor || "",
      licenseType: item.licenseType || "",
      licenseKey: item.licenseKey || "",
      totalLicenses: String(item.totalLicenses),
      purchaseDate: item.purchaseDate || "",
      expiryDate: item.expiryDate || "",
      supportExpiryDate: item.supportExpiryDate || "",
      companyId: item.companyId
        ? String(item.companyId)
        : "",
      departmentId: item.departmentId
        ? String(item.departmentId)
        : "",
      clientId: item.clientId
        ? String(item.clientId)
        : "",
      purchasedByType: item.purchasedByType || "Entity",
      purchaseScope: item.purchaseScope || "Organization",
      poNumber: item.poNumber || "",
      invoiceNumber: item.invoiceNumber || "",
      contractNumber: item.contractNumber || "",
      cost: item.cost != null ? String(item.cost) : "",
      currency: item.currency || "INR",
      purchaseSource: item.purchaseSource || "",
      remarks: item.remarks || "",
      isActive: item.isActive,
    });

    setPurchaseDialogOpen(true);
  }

  async function handlePurchaseSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!purchaseForm.softwareId) {
      setError("Please select software.");
      return;
    }

    if (!purchaseForm.vendor.trim()) {
      setError("Vendor is required.");
      return;
    }

    if (!purchaseForm.licenseType.trim()) {
      setError("License type is required.");
      return;
    }

    const totalLicenses = Number(purchaseForm.totalLicenses);

    if (!Number.isInteger(totalLicenses) || totalLicenses < 1) {
      setError("Total licenses must be at least 1.");
      return;
    }

    if (!purchaseForm.purchaseDate) {
      setError("Purchase date is required.");
      return;
    }

    if (
      purchaseForm.purchasedByType === "Entity" &&
      !purchaseForm.companyId
    ) {
      setError(
        "Please select the internal entity that purchased the license."
      );
      return;
    }

    if (
      purchaseForm.purchasedByType === "Client" &&
      !purchaseForm.clientId
    ) {
      setError(
        "Please select the client that purchased the license."
      );
      return;
    }

    if (
      purchaseForm.departmentId &&
      !purchaseForm.companyId
    ) {
      setError(
        "Please select an internal entity before selecting a department."
      );
      return;
    }

    setSavingPurchase(true);

    try {
      const payload: CreateLicensePurchaseRequest = {
        softwareId: Number(purchaseForm.softwareId),
        vendor: purchaseForm.vendor.trim(),
        licenseType: purchaseForm.licenseType.trim(),
        licenseKey: purchaseForm.licenseKey.trim() || null,

        totalLicenses,

        purchaseDate: purchaseForm.purchaseDate,
        expiryDate: purchaseForm.expiryDate || null,
        supportExpiryDate:
          purchaseForm.supportExpiryDate || null,

        companyId:
          purchaseForm.companyId
            ? Number(purchaseForm.companyId)
            : null,

        departmentId:
          purchaseForm.departmentId
            ? Number(purchaseForm.departmentId)
            : null,

        clientId:
          purchaseForm.clientId
            ? Number(purchaseForm.clientId)
            : null,

        purchasedByType:
          purchaseForm.purchasedByType,

        purchaseScope:
          purchaseForm.departmentId
            ? "Department"
            : purchaseForm.clientId
              ? "Client"
              : "Organization",

        poNumber: purchaseForm.poNumber.trim() || null,
        invoiceNumber:
          purchaseForm.invoiceNumber.trim() || null,
        contractNumber:
          purchaseForm.contractNumber.trim() || null,

        cost:
          purchaseForm.cost.trim() === ""
            ? null
            : Number(purchaseForm.cost),

        currency:
          purchaseForm.currency.trim() || "INR",

        purchaseSource:
          purchaseForm.purchaseSource.trim() || null,

        remarks: purchaseForm.remarks.trim() || null,
      };

      if (editingPurchase) {
        const updatePayload: UpdateLicensePurchaseRequest = {
          ...payload,
          isActive: purchaseForm.isActive,
        };

        await updateLicensePurchase(
          editingPurchase.id,
          updatePayload
        );
      } else {
        await createLicensePurchase(payload);
      }

      setPurchaseDialogOpen(false);
      setEditingPurchase(null);
      setPurchaseForm({ ...emptyPurchaseForm });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          "Unable to save license purchase."
      );
    } finally {
      setSavingPurchase(false);
    }
  }

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

  const eligibleLicensePurchases = useMemo(() => {
    if (!licenseForm.softwareId) {
      return [];
    }

    const softwareId = Number(licenseForm.softwareId);

    return licensePurchases.filter((purchase) => {
      if (purchase.softwareId !== softwareId) {
        return false;
      }

      const isCurrentPurchase =
        editingLicense?.licensePurchaseId === purchase.id;

      return (
        isCurrentPurchase ||
        (purchase.isActive && purchase.availableLicenses > 0)
      );
    });
  }, [
    licensePurchases,
    licenseForm.softwareId,
    editingLicense,
  ]);

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
      licensePurchaseId:
        item.licensePurchaseId != null
          ? String(item.licensePurchaseId)
          : "",
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

      if (!licenseForm.licensePurchaseId) {
        setError("Please select a license purchase batch.");
        return;
      }

      const basePayload = {
        aliasCode: licenseForm.aliasCode.trim(),
        softwareId: Number(licenseForm.softwareId),
        licensePurchaseId:
          Number(licenseForm.licensePurchaseId),
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

  function handleExportLicenses() {
    const rows = filteredLicenses.map((license) => {
      const purchase = licensePurchases.find(
        (p) => p.id === license.licensePurchaseId
      );

      return {
        ...license,
        purchasePoNumber: purchase?.poNumber || "",
      };
    });

    exportLicensesToExcel(rows, "license-inventory.xlsx");
  }

  async function handleImportLicenses(
    rows: ImportedLicenseRow[]
  ): Promise<LicenseImportResult> {
    setImportingLicenses(true);

    const failed: LicenseImportResult["failed"] = [];
    let succeeded = 0;

    try {
      for (const row of rows) {
        try {
          const softwareInput = row.software.trim();

          if (!softwareInput) {
            throw new Error("Software is required.");
          }

          const matchedSoftware = software.find(
            (s) =>
              s.name.trim().toLowerCase() ===
              softwareInput.toLowerCase()
          );

          if (!matchedSoftware) {
            throw new Error(
              `Software "${softwareInput}" was not found. Add it under Software Catalog first.`
            );
          }

          let licensePurchaseId: number | null = null;
          const poInput = row.purchasePoNumber.trim();

          if (poInput) {
            const matchedPurchase = licensePurchases.find(
              (p) =>
                (p.poNumber || "").trim().toLowerCase() ===
                poInput.toLowerCase()
            );

            licensePurchaseId = matchedPurchase ? matchedPurchase.id : null;
          }

          const payload: CreateLicenseRequest = {
            aliasCode: row.aliasCode.trim(),
            softwareId: matchedSoftware.id,
            licensePurchaseId,
            licensedEmail: row.licensedEmail.trim(),
            subscriptionId: row.subscriptionId.trim() || null,
            allowTemporaryCheckout: resolveImportedAllowCheckout(row),
            maxCheckoutDays: resolveImportedMaxCheckoutDays(row),
            purchaseDate: row.purchaseDate.trim(),
            expiryDate: row.expiryDate.trim(),
            purchaseCost: resolveImportedPurchaseCost(row),
            remarks: row.remarks.trim() || null,
          };

          await createLicense(payload);
          succeeded += 1;
        } catch (rowError: any) {
          failed.push({
            row,
            message:
              rowError?.response?.data?.message ||
              rowError?.message ||
              "Failed to create this license.",
          });
        }
      }

      if (succeeded > 0) {
        await loadData();
      }
    } finally {
      setImportingLicenses(false);
    }

    return { succeeded, failed };
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Software Titles
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage software products available for licensing.
            </p>
          </div>

          <span className="nova-spacer" />

          {canEdit ? (
            <Button size="sm" onClick={openAddSoftware}>
              <Plus className="mr-2 h-4 w-4" />
              Add Software
            </Button>
          ) : null}
        </div>

        <div className="nova-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Software</th>
                  <th>Vendor</th>
                  <th>Version</th>
                  <th>Category</th>
                  <th>License Type</th>
                  <th>Status</th>
                  {canEdit ? (
                    <th className="nova-right">Actions</th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : software.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No software configured.
                    </td>
                  </tr>
                ) : (
                  software.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.name}
                      </td>
                      <td className="nova-cell-sub">{item.vendor}</td>
                      <td className="nova-cell-sub">{item.version || "—"}</td>
                      <td className="nova-cell-sub">{item.category}</td>
                      <td className="nova-cell-sub">{item.licenseType}</td>
                      <td>
                        <span
                          className={
                            item.isActive
                              ? "nova-pill nova-pill-success"
                              : "nova-pill nova-pill-neutral"
                          }
                        >
                          <span className="nova-dot" />
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {canEdit ? (
                        <td className="nova-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSoftware(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">
              License Purchases
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track purchased license batches, seat usage and availability.
            </p>
          </div>

          <span className="nova-spacer" />

          <span className="nova-pill nova-pill-neutral">
            <span className="nova-dot" />
            {licensePurchases.length} purchase(s)
          </span>

          {canEdit ? (
            <Button onClick={openAddPurchase}>
              <Plus className="mr-2 h-4 w-4" />
              Add Purchase
            </Button>
          ) : null}
        </div>

        <div className="nova-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Software</th>
                  <th>Vendor</th>
                  <th>License Type</th>
                  <th>PO Number</th>
                  <th className="nova-right">
                    Purchased
                  </th>
                  <th className="nova-right">
                    Created
                  </th>
                  <th className="nova-right">
                    Available
                  </th>
                  <th>Expiry</th>
                  <th>Cost</th>
                  <th>Status</th>
                  {canEdit ? (
                    <th className="nova-right">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 11 : 10}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading purchases...
                    </td>
                  </tr>
                ) : licensePurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 11 : 10}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No license purchases configured.
                    </td>
                  </tr>
                ) : (
                  licensePurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="font-medium">
                        {purchase.softwareName}
                      </td>

                      <td className="nova-cell-sub">
                        {purchase.vendor}
                      </td>

                      <td className="nova-cell-sub">
                        {purchase.licenseType}
                      </td>

                      <td className="nova-cell-sub">
                        {purchase.poNumber || "—"}
                      </td>

                      <td className="nova-right font-medium">
                        {purchase.totalLicenses}
                      </td>

                      <td className="nova-right">
                        {purchase.createdLicenses}
                      </td>

                      <td className="nova-right">
                        <span
                          className={
                            purchase.availableLicenses > 0
                              ? "nova-pill nova-pill-success"
                              : "nova-pill nova-pill-neutral"
                          }
                        >
                          <span className="nova-dot" />
                          {purchase.availableLicenses}
                        </span>
                      </td>

                      <td className="nova-cell-sub">
                        {formatDate(purchase.expiryDate)}
                      </td>

                      <td className="nova-mono">
                        {purchase.cost != null
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: purchase.currency || "INR",
                              maximumFractionDigits: 2,
                            }).format(purchase.cost)
                          : "—"}
                      </td>

                      <td>
                        <span
                          className={
                            purchase.isActive
                              ? "nova-pill nova-pill-success"
                              : "nova-pill nova-pill-neutral"
                          }
                        >
                          <span className="nova-dot" />
                          {purchase.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {canEdit ? (
                        <td className="nova-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Edit Purchase"
                            onClick={() =>
                              openEditPurchase(purchase)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">
              License Inventory
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track individual licenses, subscriptions, cost and expiry.
            </p>
          </div>

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

          <span className="nova-muted-count">
            {filteredLicenses.length} license(s)
          </span>

          <span className="nova-spacer" />

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLicenses}
            disabled={filteredLicenses.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLicenseImportOpen(true)}
              disabled={software.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
          ) : null}

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

        <div className="nova-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Software</th>
                  <th>Licensed Email</th>
                  <th>Subscription ID</th>
                  <th>Status</th>
                  <th>Purchase Date</th>
                  <th>Expiry Date</th>
                  <th>Cost</th>
                  {canEdit ? (
                    <th className="nova-right">Actions</th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading licenses…
                    </td>
                  </tr>
                ) : filteredLicenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No licenses found.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.aliasCode}
                      </td>
                      <td>{item.softwareName}</td>
                      <td className="nova-cell-sub">{item.licensedEmail}</td>
                      <td className="nova-cell-sub">
                        {item.subscriptionId || "—"}
                      </td>
                      <td>
                        <span className={licenseStatusPillClass(item.status)}>
                          <span className="nova-dot" />
                          {item.status}
                        </span>
                      </td>
                      <td className="nova-cell-sub">
                        {formatDate(item.purchaseDate)}
                      </td>
                      <td className="nova-cell-sub">
                        {formatDate(item.expiryDate)}
                      </td>
                      <td className="nova-mono">
                        {formatCurrency(Number(item.purchaseCost))}
                      </td>

                      {canEdit ? (
                        <td className="nova-right">
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
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      <Dialog
        open={purchaseDialogOpen}
        onOpenChange={(open) => {
          if (savingPurchase) return;

          setPurchaseDialogOpen(open);

          if (!open) {
            setEditingPurchase(null);
            setPurchaseForm({ ...emptyPurchaseForm });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingPurchase
                ? "Edit License Purchase"
                : "Add License Purchase"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handlePurchaseSubmit}
            className="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Software *
                </label>

                <Select
                  value={purchaseForm.softwareId}
                  onValueChange={(value) =>
                    setPurchaseForm((current) => ({
                      ...current,
                      softwareId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select software" />
                  </SelectTrigger>

                  <SelectContent>
                    {software
                      .filter(
                        (item) =>
                          item.isActive ||
                          item.id === editingPurchase?.softwareId
                      )
                      .map((item) => (
                        <SelectItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Vendor *
                </label>

                <Input
                  value={purchaseForm.vendor}
                  onChange={(e) =>
                    setPurchaseForm((current) => ({
                      ...current,
                      vendor: e.target.value,
                    }))
                  }
                  placeholder="e.g. Autodesk Partner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  License Type *
                </label>

                <Input
                  value={purchaseForm.licenseType}
                  onChange={(e) =>
                    setPurchaseForm((current) => ({
                      ...current,
                      licenseType: e.target.value,
                    }))
                  }
                  placeholder="e.g. Named User"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Total Licenses *
                </label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={purchaseForm.totalLicenses}
                  onChange={(e) =>
                    setPurchaseForm((current) => ({
                      ...current,
                      totalLicenses: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-1 text-sm font-semibold">
                Purchase Ownership
              </h3>

              <p className="mb-4 text-xs text-muted-foreground">
                Define who purchased the license and which internal
                entity, department and client use it.
              </p>

              <div className="grid gap-4 md:grid-cols-2">

                {/* Purchased By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Purchased By *
                  </label>

                  <Select
                    value={purchaseForm.purchasedByType}
                    onValueChange={(value) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        purchasedByType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchaser" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="Entity">
                        Internal Entity
                      </SelectItem>

                      <SelectItem value="Client">
                        Client
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {/* Internal Entity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Internal Entity
                    {purchaseForm.purchasedByType === "Entity"
                      ? " *"
                      : ""}
                  </label>

                  <Select
                    value={purchaseForm.companyId}
                    onValueChange={(value) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        companyId: value,
                        departmentId: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>

                    <SelectContent>
                      {companies
                        .filter(
                          (item) =>
                            item.isActive ||
                            item.id ===
                              editingPurchase?.companyId
                        )
                        .map((item) => (
                          <SelectItem
                            key={item.id}
                            value={String(item.id)}
                          >
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Department */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Department
                  </label>

                  <Select
                    value={purchaseForm.departmentId}
                    disabled={!purchaseForm.companyId}
                    onValueChange={(value) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        departmentId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          purchaseForm.companyId
                            ? "Select department"
                            : "Select entity first"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {departments
                        .filter(
                          (item) =>
                            item.companyId ===
                              Number(purchaseForm.companyId) &&
                            (
                              item.isActive ||
                              item.id ===
                                editingPurchase?.departmentId
                            )
                        )
                        .map((item) => (
                          <SelectItem
                            key={item.id}
                            value={String(item.id)}
                          >
                            {item.departmentName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Client */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client
                    {purchaseForm.purchasedByType === "Client"
                      ? " *"
                      : ""}
                  </label>

                  <Select
                    value={purchaseForm.clientId}
                    onValueChange={(value) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        clientId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>

                    <SelectContent>
                      {clients
                        .filter(
                          (item) =>
                            item.isActive ||
                            item.id ===
                              editingPurchase?.clientId
                        )
                        .map((item) => (
                          <SelectItem
                            key={item.id}
                            value={String(item.id)}
                          >
                            {item.name} ({item.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">
                Dates
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Purchase Date *
                  </label>

                  <Input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        purchaseDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Expiry Date
                  </label>

                  <Input
                    type="date"
                    value={purchaseForm.expiryDate}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        expiryDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Support Expiry
                  </label>

                  <Input
                    type="date"
                    value={purchaseForm.supportExpiryDate}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        supportExpiryDate:
                          e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">
                Commercial Details
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    PO Number
                  </label>

                  <Input
                    value={purchaseForm.poNumber}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        poNumber: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Invoice Number
                  </label>

                  <Input
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        invoiceNumber: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Contract Number
                  </label>

                  <Input
                    value={purchaseForm.contractNumber}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        contractNumber: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Total Cost
                  </label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseForm.cost}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        cost: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Currency
                  </label>

                  <Select
                    value={purchaseForm.currency}
                    onValueChange={(value) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        currency: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Purchase Source
                  </label>

                  <Input
                    value={purchaseForm.purchaseSource}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        purchaseSource: e.target.value,
                      }))
                    }
                    placeholder="e.g. Direct / Reseller"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    License Key
                  </label>

                  <Input
                    value={purchaseForm.licenseKey}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        licenseKey: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Remarks
                  </label>

                  <Input
                    value={purchaseForm.remarks}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        remarks: e.target.value,
                      }))
                    }
                    placeholder="Optional remarks"
                  />
                </div>
              </div>

              {editingPurchase ? (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={purchaseForm.isActive}
                    onChange={(e) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        isActive: e.target.checked,
                      }))
                    }
                  />

                  Active purchase
                </label>
              ) : null}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={savingPurchase}
                onClick={() =>
                  setPurchaseDialogOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={savingPurchase}
              >
                {savingPurchase
                  ? "Saving..."
                  : editingPurchase
                    ? "Update Purchase"
                    : "Create Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  setLicenseForm((current) => ({
                    ...current,
                    softwareId: value,
                    licensePurchaseId: "",
                    purchaseDate: "",
                    expiryDate: "",
                    purchaseCost: "0",
                  }))
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
                Purchase Batch *
              </label>

              <Select
                value={licenseForm.licensePurchaseId}
                disabled={!licenseForm.softwareId}
                onValueChange={(value) => {
                  const purchase = licensePurchases.find(
                    (item) => item.id === Number(value)
                  );

                  if (!purchase) {
                    return;
                  }

                  const perSeatCost =
                    purchase.cost != null &&
                    purchase.totalLicenses > 0
                      ? purchase.cost / purchase.totalLicenses
                      : 0;

                  setLicenseForm((current) => ({
                    ...current,
                    licensePurchaseId: value,
                    purchaseDate:
                      purchase.purchaseDate?.slice(0, 10) || "",
                    expiryDate:
                      purchase.expiryDate?.slice(0, 10) || "",
                    purchaseCost: String(perSeatCost),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      licenseForm.softwareId
                        ? "Select purchase batch"
                        : "Select software first"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {eligibleLicensePurchases.map((purchase) => (
                    <SelectItem
                      key={purchase.id}
                      value={String(purchase.id)}
                    >
                      {purchase.poNumber || `Purchase #${purchase.id}`}
                      {" | "}
                      {purchase.vendor}
                      {" | "}
                      {purchase.availableLicenses} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {licenseForm.softwareId &&
              eligibleLicensePurchases.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No purchase batch with available seats exists for
                  this software.
                </p>
              ) : null}
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
                
                  readOnly/>
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
                
                  readOnly/>
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
              
                  readOnly/>
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

      <LicenseImportDialog
        open={licenseImportOpen}
        onOpenChange={setLicenseImportOpen}
        importing={importingLicenses}
        onImport={handleImportLicenses}
      />
    </div>
  );
}
