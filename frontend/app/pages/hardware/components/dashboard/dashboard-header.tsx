import { Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardHeaderProps {
  canEdit: boolean;
  onExport: () => void;
  onImport: () => void;
  onAdd: () => void;
}

export function DashboardHeader({
  canEdit,
  onExport,
  onImport,
  onAdd,
}: DashboardHeaderProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">
            Hardware Assets
          </CardTitle>

          <CardDescription className="mt-2 text-sm">
            Manage hardware inventory, ownership, warranty,
            lifecycle status, and asset allocation from a
            centralized dashboard.
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={onImport}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>

              <Button
                onClick={onAdd}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent />
    </Card>
  );
}
