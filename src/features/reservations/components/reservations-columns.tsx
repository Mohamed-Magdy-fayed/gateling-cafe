import type { ColumnDef } from "@tanstack/react-table";
import type { ComponentProps } from "react";
import {
    DataTableColumnHeader,
    selectColumn,
} from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import type { Reservation } from "@/drizzle/schema";
import { ReservationsActions } from "@/features/reservations/components/reservations-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { mainTranslations } from "@/lib/i18n/global";
import type { TFunction } from "@/lib/i18n/lib";
import type { Option } from "@/types/data-table";

export const getReservationsColumns = ({
    statusCounts,
    getTranslation,
}: {
    statusCounts: Option[];
    getTranslation: TFunction<typeof mainTranslations>;
}) => {
    return [
        selectColumn,
        {
            accessorKey: "reservationCode",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.reservationCode")}
                />
            ),
            meta: {
                label: getTranslation("reservationsTranslations.reservationCode"),
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "customerName",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.customerName")}
                />
            ),
            meta: {
                label: getTranslation("reservationsTranslations.customerName"),
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "customerPhone",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.customerPhone")}
                />
            ),
            meta: {
                label: getTranslation("reservationsTranslations.customerPhone"),
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.status")}
                />
            ),
            cell: ({ row }) => (
                <Badge className={row.original.status === "started" ? "bg-destructive text-destructive-foreground border-destructive" : undefined} variant={getStatusVariant(row.original.status)}>
                    {getTranslation("reservationsTranslations.statusNames", {
                        statusName: row.original.status,
                    })}
                </Badge>
            ),
            meta: {
                label: getTranslation("reservationsTranslations.status"),
                variant: "multiSelect",
                options: statusCounts,
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "totalPrice",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.totalPrice")}
                />
            ),
            cell: ({ row }) => formatCurrency(row.original.totalPrice),
            meta: {
                variant: "range",
                label: getTranslation("reservationsTranslations.totalPrice"),
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "totalPaid",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.totalPaid")}
                />
            ),
            cell: ({ row }) => formatCurrency(row.original.totalPaid || 0),
            meta: {
                variant: "range",
                label: getTranslation("reservationsTranslations.totalPaid"),
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "startTime",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.startTime")}
                />
            ),
            cell: ({ row }) =>
                formatDate(row.original.startTime, {
                    month: undefined,
                    year: undefined,
                    day: undefined,
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            meta: {
                variant: "dateRange",
                label: getTranslation("reservationsTranslations.startTime"),
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "endTime",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("reservationsTranslations.endTime")}
                />
            ),
            cell: ({ row }) =>
                formatDate(row.original.endTime, {
                    month: undefined,
                    year: undefined,
                    day: undefined,
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            meta: {
                variant: "dateRange",
                label: getTranslation("reservationsTranslations.endTime"),
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title={getTranslation("common.createdAt")}
                />
            ),
            cell: ({ row }) => formatDate(row.original.createdAt),
            meta: {
                label: getTranslation("common.createdAt"),
                variant: "dateRange",
            },
            enableColumnFilter: true,
        },
        {
            id: "actions",
            maxSize: 10,
            cell: ({ row }) => <ReservationsActions reservation={row.original} />,
        },
    ] satisfies ColumnDef<Reservation>[];
};

function getStatusVariant(
    status: Reservation["status"],
): ComponentProps<typeof Badge>["variant"] {
    switch (status) {
        case "reserved":
            return "default";
        case "started":
            return "outline";
        case "cancelled":
            return "destructive";
        default:
            return "secondary";
    }
}
