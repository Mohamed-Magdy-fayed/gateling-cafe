"use client";

import { PlusSquareIcon } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSheet } from "@/components/data-table/data-table-sheet";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { Order } from "@/drizzle/schema";
import { OrdersActionBar } from "@/features/orders/components/orders-action-bar";
import { getOrdersColumns } from "@/features/orders/components/orders-columns";
import { OrdersForm } from "@/features/orders/components/orders-form";
import { useDataTable } from "@/hooks/use-data-table";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Option } from "@/types/data-table";

export function OrdersClient({
    orders,
    statusCounts,
}: {
    orders: Order[];
    statusCounts: Option[];
}) {
    const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);

    const { table } = useDataTable({
        columns: getOrdersColumns({
            createdAt: t("common.createdAt"),
            status: t("ordersTranslations.status"),
            orderNumber: t("ordersTranslations.orderNumber"),
            customerName: t("ordersTranslations.customerName"),
            customerPhone: t("ordersTranslations.customerPhone"),
            orderTotal: t("ordersTranslations.orderTotal"),
            totalPaid: t("ordersTranslations.totalPaid"),
            statusCounts,
            getTranslation: t,
        }),
        data: orders,
    });

    return (
        <DataTable table={table}>
            <OrdersActionBar table={table} />
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
                    content={<OrdersForm setIsOpen={setIsOpen} />}
                />
            </DataTableToolbar>
        </DataTable>
    );
}
