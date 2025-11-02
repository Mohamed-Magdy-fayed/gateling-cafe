import type { ColumnDef } from "@tanstack/react-table";
import {
    DataTableColumnHeader,
    selectColumn,
} from "@/components/data-table/data-table-column-header";
import type { Order } from "@/drizzle/schema";
import { OrdersActions } from "@/features/orders/components/orders-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { mainTranslations } from "@/lib/i18n/global";
import type { TFunction } from "@/lib/i18n/lib";
import type { Option } from "@/types/data-table";

type Translations = {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    orderTotal: string;
    totalPaid: string;
    status: string;
    createdAt: string;
};

export const getOrdersColumns = ({
    orderNumber,
    customerName,
    customerPhone,
    orderTotal,
    totalPaid,
    status,
    createdAt,
    statusCounts,
    getTranslation,
}: Translations & {
    statusCounts: Option[];
    getTranslation: TFunction<typeof mainTranslations>;
}) => {
    return [
        selectColumn,
        {
            accessorKey: "orderNumber",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={orderNumber} />
            ),
            meta: {
                label: orderNumber,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "customerName",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={customerName} />
            ),
            meta: {
                label: customerName,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "customerPhone",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={customerPhone} />
            ),
            meta: {
                label: customerPhone,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={status} />
            ),
            cell: ({ row }) => getTranslation("ordersTranslations.statusNames", { statusName: row.original.status }),
            meta: {
                label: status,
                variant: "multiSelect",
                options: statusCounts,
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "orderTotal",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={orderTotal} />
            ),
            cell: ({ row }) => formatCurrency(row.original.orderTotal),
            meta: {
                label: orderTotal,
                variant: "range",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "totalPaid",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={totalPaid} />
            ),
            cell: ({ row }) => formatCurrency(row.original.totalPaid),
            meta: {
                label: totalPaid,
                variant: "range",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={createdAt} />
            ),
            cell: ({ row }) => formatDate(row.original.createdAt),
            meta: {
                label: createdAt,
                variant: "dateRange",
            },
            enableColumnFilter: true,
        },
        {
            id: "actions",
            maxSize: 10,
            cell: ({ row }) => <OrdersActions order={row.original} />,
        },
    ] satisfies ColumnDef<Order>[];
};
