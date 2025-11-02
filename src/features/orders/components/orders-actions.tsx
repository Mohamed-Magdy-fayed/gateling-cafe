"Use client";

import {
    Edit2Icon,
    InfoIcon,
    MoreHorizontalIcon,
    Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import DataTableInfoModal from "@/components/data-table/data-table-info-modal";
import { DataTableSheet } from "@/components/data-table/data-table-sheet";
import { ModalSheetComponent } from "@/components/general/modal-sheet-compo";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Order } from "@/drizzle/schema";
import { deleteOrders } from "@/features/orders/actions";
import { OrdersForm } from "@/features/orders/components/orders-form";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OrdersActions({ order }: { order: Order }) {
    const { t } = useTranslation();

    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    async function handleDelete() {
        deleteOrders([order.id]);
    }

    return (
        <>
            <DataTableInfoModal
                onOpenChange={setIsInfoOpen}
                open={isInfoOpen}
                entity={order}
                entityName={t("ordersTranslations.order")}
            />
            <ModalSheetComponent
                isOpen={isDeleteOpen}
                onOpenChange={(val) => setIsDeleteOpen(val)}
                title={t("common.delete")}
                description={t("common.areYouSure")}
                content={<Button onClick={handleDelete}>{t("common.delete")}</Button>}
            />
            <DataTableSheet
                isUpdate
                content={<OrdersForm order={order} setIsOpen={setIsUpdateOpen} />}
                open={isUpdateOpen}
                onOpenChange={setIsUpdateOpen}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-4 my-1" size="sm">
                        <MoreHorizontalIcon className="size-4" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setIsUpdateOpen(true)}>
                            <InfoIcon />
                            {t("common.info")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsUpdateOpen(true)}>
                            <Edit2Icon />
                            {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setIsDeleteOpen(true)}
                        >
                            <Trash2Icon />
                            {t("common.delete")}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
