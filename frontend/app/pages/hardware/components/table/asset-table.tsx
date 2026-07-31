return (
  <div className="space-y-6">
    <DashboardHeader
      canEdit={canEdit}
      assetCount={filteredAssets.length}
      onAdd={openAdd}
      onImport={() => setImportOpen(true)}
      onExport={() => exportAssetsToExcel(filteredAssets)}
    />

    <HardwareStats
      assets={assetsWithAssignments}
    />

    <WarrantyAlerts
      assets={assetsWithAssignments}
    />

    <AssetFilters
      search={search}
      onSearchChange={setSearch}
      status={statusFilter}
      onStatusChange={setStatusFilter}
      department={departmentFilter}
      onDepartmentChange={setDepartmentFilter}
      departments={departments as LookupOption[]}
      assetCount={filteredAssets.length}
      isTeamLeader={isTeamLeader}
      onReset={() => {
        setSearch("");
        setStatusFilter("all");
        setDepartmentFilter("all");
      }}
    />

    <AssetTable
      assets={filteredAssets}
      loading={loading || assignmentsLoading}
      sortField={sortKey}
      sortDirection={sortDir}
      onSort={toggleSort}
      onView={openView}
      onEdit={openEdit}
      onDelete={openDelete}
      onTransfer={openTransfer}
      onHistory={openHistory}
      onReturn={handleReturn}
      canEdit={canEdit}
    />

    {/* Existing dialogs remain unchanged */}
  </div>
);
                    {assets.map((asset) => (
                        <TableRow
                            key={asset.id}
                            className="hover:bg-muted/40 transition-colors"
                        >
                            <TableCell className="font-medium">
                                {asset.asset_tag}
                            </TableCell>

                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {asset.computer_name || "-"}
                                    </span>

                                    <span className="text-xs text-muted-foreground">
                                        {asset.host_name || asset.serial_number || "-"}
                                    </span>
                                </div>
                            </TableCell>

                            <TableCell>
                                {asset.assigned_user_name ?? (
                                    <span className="text-muted-foreground">
                                        Unassigned
                                    </span>
                                )}
                            </TableCell>

                            <TableCell>
                                {asset.department_name ?? "-"}
                            </TableCell>

                            <TableCell>
                                <StatusBadge status={asset.status} />
                            </TableCell>

                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm">
                                        {formatDate(asset.warranty_expiry)}
                                    </span>

                                    <WarrantyBadge
                                        warrantyDate={asset.warranty_expiry}
                                    />
                                </div>
                            </TableCell>

                            <TableCell className="text-right">
                                <DropdownMenu>

                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                        >
                                            Actions
                                        </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end">

                                        <DropdownMenuItem
                                            onClick={() => onView(asset)}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onClick={() => onHistory(asset)}
                                        >
                                            <History className="mr-2 h-4 w-4" />
                                            Audit History
                                        </DropdownMenuItem>

                                        {canEdit && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() => onEdit(asset)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onTransfer(asset)
                                                    }
                                                >
                                                    <Repeat className="mr-2 h-4 w-4" />

                                                    {asset.current_assignment_id
                                                        ? "Transfer"
                                                        : "Assign"}
                                                </DropdownMenuItem>

                                                {asset.current_assignment_id && (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onReturn(asset)
                                                        }
                                                    >
                                                        <Undo2 className="mr-2 h-4 w-4" />
                                                        Return
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() =>
                                                        onDelete(asset)
                                                    }
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </>
                                        )}

                                    </DropdownMenuContent>

                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
