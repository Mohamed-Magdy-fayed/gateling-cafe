import type { ColumnDef } from "@tanstack/react-table";
import {
    DataTableColumnHeader,
    selectColumn,
} from "@/components/data-table/data-table-column-header";
import type { Product } from "@/drizzle/schema";
import { ProductsActions } from "@/features/products/components/products-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { mainTranslations } from "@/lib/i18n/global";
import type { TFunction } from "@/lib/i18n/lib";
import type { Option } from "@/types/data-table";

type Translations = {
    name: string;
    priceCents: string;
    type: string;
    category: string;
    status: string;
    createdAt: string;
};

export const getProductsColumns = ({
    name,
    priceCents,
    type,
    category,
    status,
    createdAt,
    typesCounts,
    categoriesCounts,
    statusCounts,
    getTranslation,
}: Translations & {
    typesCounts: Option[];
    categoriesCounts: Option[];
    statusCounts: Option[];
    getTranslation: TFunction<typeof mainTranslations>;
}) => {
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
            accessorKey: "type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={type} />
            ),
            cell: ({ row }) => getTranslation("productsTranslations.typeNames", { typeName: row.original.type }),
            meta: {
                label: type,
                variant: "multiSelect",
                options: typesCounts,
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "category",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={category} />
            ),
            cell: ({ row }) => getTranslation("productsTranslations.categoryNames", { categoryName: row.original.category }),
            meta: {
                label: category,
                variant: "multiSelect",
                options: categoriesCounts,
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={status} />
            ),
            cell: ({ row }) => getTranslation("productsTranslations.statusNames", { statusName: row.original.status }),
            meta: {
                label: status,
                variant: "multiSelect",
                options: statusCounts,
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
