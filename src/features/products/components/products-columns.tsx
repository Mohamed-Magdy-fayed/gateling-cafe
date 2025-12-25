import type { ColumnDef } from "@tanstack/react-table";

import {
    DataTableColumnHeader,
    selectColumn,
} from "@/components/data-table/data-table-column-header";
import type { Product } from "@/drizzle/schema";
import { ProductsActions } from "@/features/products/components/products-actions";
import { formatCurrency, formatDate } from "@/lib/format";

type Translations = {
    name: string;
    priceCents: string;
    createdAt: string;
};

export const getProductsColumns = ({
    name,
    priceCents,
    createdAt,
}: Translations) => {
    return [
        selectColumn,
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={name} />
            ),
            meta: {
                label: name,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "priceCents",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={priceCents} />
            ),
            cell: ({ row }) => formatCurrency(row.original.priceCents),
            meta: {
                label: priceCents,
                variant: "text",
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
            cell: ({ row }) => <ProductsActions product={row.original} />,
        },
    ] satisfies ColumnDef<Product>[];
};
