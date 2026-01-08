"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Settings2Icon, Trash2Icon } from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { toast } from "sonner";
import { DataGrid } from "@/components/data-grid/data-grid";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    deletePlaytimeOption,
    getPlaytimeOptions,
    upsertPlaytimeOption,
} from "@/features/reservations/actions";
import { useDataGrid } from "@/hooks/use-data-grid";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Draft = {
    id?: string;
    name: string;
    durationMinutes: number | null;
    price: number | null;
};

type DraftRow = Draft & { clientId: string };

export function PlaytimeOptionsSettingsSheet() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DraftRow | null>(null);
    const [isPending, startTransition] = useTransition();

    const [rows, setRows] = useState<DraftRow[]>([]);
    const prevRowsRef = useRef<DraftRow[]>([]);

    const createRow = useCallback((row: Draft): DraftRow => {
        return {
            ...row,
            clientId: row.id ?? crypto.randomUUID(),
        };
    }, []);

    const validateRow = useCallback(
        (row: Draft) => {
            const requiredMessage = t("common.required") ?? "Please fill all fields.";
            if (!row.name.trim()) return requiredMessage;
            if (!row.durationMinutes || row.durationMinutes <= 0)
                return requiredMessage;
            if (row.price === null || row.price < 0) return requiredMessage;
            return null;
        },
        [t],
    );

    const persistRow = useCallback(
        (row: DraftRow) => {
            const error = validateRow(row);
            if (error) {
                toast.error(error);
                return;
            }

            startTransition(async () => {
                const res = await upsertPlaytimeOption({
                    id: row.id,
                    name: row.name.trim(),
                    durationMinutes: row.durationMinutes ?? 0,
                    price: row.price ?? 0,
                });

                if (res.error) {
                    toast.error(res.message);
                    return;
                }

                setRows((prev) =>
                    prev.map((item) =>
                        item.clientId === row.clientId
                            ? { ...item, ...res.data, clientId: item.clientId }
                            : item,
                    ),
                );
            });
        },
        [startTransition, validateRow],
    );

    const handleDelete = useCallback(
        (row: DraftRow) => {
            const id = row.id;
            if (!id) {
                setRows((prev) =>
                    prev.filter((item) => item.clientId !== row.clientId),
                );
                return;
            }

            startTransition(async () => {
                const res = await deletePlaytimeOption(id);
                if (res.error) {
                    toast.error(res.message);
                    return;
                }
                setRows((prev) => prev.filter((item) => item.id !== row.id));
                toast.success(
                    t("reservationsTranslations.playtimeSettings.deletedToast"),
                );
            });
        },
        [startTransition, t],
    );

    const columns = useMemo<ColumnDef<DraftRow>[]>(
        () => [
            {
                accessorKey: "name",
                header: t("reservationsTranslations.playtimeSettings.name"),
                meta: {
                    label: t("reservationsTranslations.playtimeSettings.name"),
                    cell: { variant: "short-text" },
                },
                size: 200,
            },
            {
                accessorKey: "durationMinutes",
                header: t("reservationsTranslations.playtimeSettings.durationMinutes"),
                meta: {
                    label: t("reservationsTranslations.playtimeSettings.durationMinutes"),
                    cell: { variant: "number", min: 1, step: 5 },
                },
                size: 160,
            },
            {
                accessorKey: "price",
                header: t("reservationsTranslations.playtimeSettings.price"),
                meta: {
                    label: t("reservationsTranslations.playtimeSettings.price"),
                    cell: { variant: "number", min: 0, step: 5 },
                },
                size: 140,
            },
            {
                id: "actions",
                header: () => (
                    <span className="text-sm font-medium text-muted-foreground">
                        {t("common.actions") ?? "Actions"}
                    </span>
                ),
                enableResizing: false,
                enableSorting: false,
                enableHiding: false,
                size: 150,
                cell: ({ row }) => (
                    <div className="flex h-full w-full items-center justify-center">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(row.original)}
                        >
                            <Trash2Icon className="size-4" />
                        </Button>
                    </div>
                ),
            },
        ],
        [handleDelete, isPending, t],
    );

    const dataGrid = useDataGrid<DraftRow>({
        data: rows,
        columns,
        onDataChange: (nextRows) => {
            setRows(nextRows);

            const prevMap = new Map(prevRowsRef.current.map((r) => [r.clientId, r]));
            const changed = nextRows.find((row) => {
                const prev = prevMap.get(row.clientId);
                if (!prev) return true;
                return (
                    prev.name !== row.name ||
                    prev.durationMinutes !== row.durationMinutes ||
                    prev.price !== row.price
                );
            });

            if (changed) {
                persistRow(changed);
            }

            prevRowsRef.current = nextRows;
        },
        getRowId: (row) => row.id ?? row.clientId,
        onRowAdd: () => {
            let targetIndex = 0;
            setRows((prev) => {
                targetIndex = prev.length;
                return [
                    ...prev,
                    createRow({ name: "", durationMinutes: null, price: null }),
                ];
            });
            return { rowIndex: targetIndex, columnId: "name" };
        },
    });

    useEffect(() => {
        if (!open) return;

        startTransition(async () => {
            const res = await getPlaytimeOptions();
            if (res.error) {
                toast.error(res.message);
                return;
            }

            const fetched = res.data.map((r) =>
                createRow({
                    id: r.id,
                    name: r.name,
                    durationMinutes: r.durationMinutes,
                    price: r.price,
                }),
            );
            setRows(fetched);
            prevRowsRef.current = fetched;
        });
    }, [createRow, open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                    <Settings2Icon className="size-4" />
                    {t("reservationsTranslations.playtimeSettings.title")}
                </Button>
            </SheetTrigger>
            <SheetContent className="max-w-3xl!">
                <SheetHeader>
                    <SheetTitle>
                        {t("reservationsTranslations.playtimeSettings.title")}
                    </SheetTitle>
                </SheetHeader>

                <div className="p-4">
                    <DataGrid {...dataGrid} stretchColumns />
                </div>

                <AlertDialog
                    open={!!deleteTarget}
                    onOpenChange={(next) => {
                        if (!next) setDeleteTarget(null);
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {t("common.areYouSure") ?? "Are you sure?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {t("common.deletionConfirmation") ??
                                    "This action cannot be undone."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                disabled={isPending}
                                onClick={() => setDeleteTarget(null)}
                            >
                                {t("common.cancel") ?? "Cancel"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isPending}
                                onClick={() => {
                                    if (deleteTarget) handleDelete(deleteTarget);
                                    setDeleteTarget(null);
                                }}
                            >
                                {t("common.delete") ?? "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
        </Sheet>
    );
}
