import { Search, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { LookupOption } from "@/app/pages/hardware/types";

interface AssetFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;

    status: string;
    onStatusChange: (value: string) => void;

    department: string;
    onDepartmentChange: (value: string) => void;

    departments: LookupOption[];

    assetCount: number;

    isTeamLeader: boolean;

    onReset: () => void;
}

export function AssetFilters({

    search,
    onSearchChange,

    status,
    onStatusChange,

    department,
    onDepartmentChange,

    departments,

    assetCount,

    isTeamLeader,

    onReset,

}: AssetFiltersProps) {

    return (

        <div className="rounded-xl border bg-card p-4 shadow-sm">

            <div className="grid gap-4 lg:grid-cols-12">

                <div className="relative lg:col-span-5">

                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                    <Input
                        className="pl-9"
                        placeholder="Search Asset Tag, Computer, User, Serial..."
                        value={search}
                        onChange={(e) =>
                            onSearchChange(e.target.value)
                        }
                    />

                </div>

                <div className="lg:col-span-2">

                    <Select
                        value={status}
                        onValueChange={onStatusChange}
                    >

                        <SelectTrigger>

                            <SelectValue placeholder="Status" />

                        </SelectTrigger>

                        <SelectContent>

                            <SelectItem value="all">
                                All Status
                            </SelectItem>

                            <SelectItem value="Assigned">
                                Assigned
                            </SelectItem>

                            <SelectItem value="Available">
                                Available
                            </SelectItem>

                            <SelectItem value="Maintenance">
                                Maintenance
                            </SelectItem>

                            <SelectItem value="Scrap">
                                Scrap
                            </SelectItem>

                        </SelectContent>

                    </Select>

                </div>

                {!isTeamLeader && (

                    <div className="lg:col-span-3">

                        <Select
                            value={department}
                            onValueChange={onDepartmentChange}
                        >

                            <SelectTrigger>

                                <SelectValue placeholder="Department" />

                            </SelectTrigger>

                            <SelectContent>

                                <SelectItem value="all">

                                    All Departments

                                </SelectItem>

                                {departments.map((dept) => (

                                    <SelectItem
                                        key={dept.id}
                                        value={String(dept.id)}
                                    >

                                        {dept.name}

                                    </SelectItem>

                                ))}

                            </SelectContent>

                        </Select>

                    </div>

                )}

                <div className="flex items-center justify-end gap-2 lg:col-span-2">

                    <Button
                        variant="outline"
                        onClick={onReset}
                    >

                        <RotateCcw className="mr-2 h-4 w-4" />

                        Reset

                    </Button>

                    <div className="text-sm text-muted-foreground whitespace-nowrap">

                        {assetCount} Assets

                    </div>

                </div>

            </div>

        </div>

    );

}
