"use client";

import { PlusSquareIcon } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSheet } from "@/components/data-table/data-table-sheet";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { Product } from "@/drizzle/schema";
import { ProductsActionBar } from "@/features/products/components/products-action-bar";
import { getProductsColumns } from "@/features/products/components/products-columns";
import { ProductsForm } from "@/features/products/components/products-form";
import { useDataTable } from "@/hooks/use-data-table";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ProductsClient({
    products,
}: {
    products: Product[];
}) {
    const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);

    const { table } = useDataTable({
        columns: getProductsColumns({
            createdAt: t("common.createdAt"),
            name: t("productsTranslations.name"),
            priceCents: t("productsTranslations.price"),
        }),
        data: products,
    });

    return (
        <DataTable table={table}>
            <ProductsActionBar table={table} />
            <DataTableToolbar table={table}>
                <DataTableSheet
                    open={isOpen}
                    onOpenChange={(val) => setIsOpen(val)}
                    trigger={
                        <Button size="sm">
                            <PlusSquareIcon className="size-4" />
                            {t("common.add")}
                        </Button>
                    }
                    content={<ProductsForm setIsOpen={setIsOpen} />}
                />
            </DataTableToolbar>
        </DataTable>
    );
}
