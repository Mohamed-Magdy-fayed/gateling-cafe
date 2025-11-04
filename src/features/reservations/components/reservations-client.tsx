"use client";

import { PlusSquareIcon } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSheet } from "@/components/data-table/data-table-sheet";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { Reservation } from "@/drizzle/schema";
import { ReservationsActionBar } from "@/features/reservations/components/reservations-action-bar";
import { getReservationsColumns } from "@/features/reservations/components/reservations-columns";
import { ReservationsForm } from "@/features/reservations/components/reservations-form";
import { useReservationAnnouncements } from "@/features/reservations/hooks/use-reservation-announcements";
import { useReservationStart } from "@/features/reservations/hooks/use-reservation-start";
import { useDataTable } from "@/hooks/use-data-table";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Option } from "@/types/data-table";

export function ReservationsClient({
    reservations,
    statusCounts,
}: {
    reservations: Reservation[];
    statusCounts: Option[];
}) {
    const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);

    const { table } = useDataTable({
        columns: getReservationsColumns({
            statusCounts,
            getTranslation: t,
        }),
        data: reservations,
    });

    useReservationAnnouncements(reservations);
    useReservationStart(reservations);

    return (
        <DataTable table={table}>
            <ReservationsActionBar table={table} />
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
                    content={<ReservationsForm setIsOpen={setIsOpen} />}
                />
            </DataTableToolbar>
        </DataTable>
    );
}
