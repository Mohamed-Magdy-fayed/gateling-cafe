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
import type { Reservation } from "@/drizzle/schema";
import { deleteReservations } from "@/features/reservations/actions";
import { ReservationsForm } from "@/features/reservations/components/reservations-form";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ReservationsActions({ reservation }: { reservation: Reservation }) {
    const { t } = useTranslation();

    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    async function handleDelete() {
        deleteReservations([reservation.id]);
    }

    return (
        <>
            <DataTableInfoModal
                onOpenChange={setIsInfoOpen}
                open={isInfoOpen}
                entity={reservation}
                entityName={t("reservationsTranslations.reservation")}
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
                content={<ReservationsForm reservation={reservation} setIsOpen={setIsUpdateOpen} />}
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
