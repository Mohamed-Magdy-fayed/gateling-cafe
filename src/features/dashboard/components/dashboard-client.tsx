"use client";

import { DashboardHeader, DashboardKpis, DayClosingCard } from "@/features/dashboard/components/dashboard-kpis";
import { TopProductsCard } from "@/features/dashboard/components/dashboard-sections";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export function DashboardClient({
    snapshot,
    canViewOrders,
    canViewReservations,
    canCloseDay,
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
    canViewReservations: boolean;
    canCloseDay: boolean;
}) {
    const { t } = useTranslation();

    const kpiRange = {
        from: new Date(snapshot.range.kpisRevenue.from),
        to: new Date(snapshot.range.kpisRevenue.to),
    };

    const shiftRange = snapshot.dayClosure
        ? { from: new Date(snapshot.dayClosure.openedAt), to: new Date() }
        : null;

    return (
        <div className="container mx-auto p-4 space-y-4">
            <DashboardHeader
                defaultRange={kpiRange}
                shiftRange={shiftRange}
            />

            <DashboardKpis
                snapshot={snapshot}
                canViewOrders={canViewOrders}
                canViewReservations={canViewReservations}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <TopProductsCard snapshot={snapshot} canViewOrders={canViewOrders} />
                <DayClosingCard snapshot={snapshot} canCloseDay={canCloseDay} />
            </div>

            {!canViewOrders && !canViewReservations ? (
                <div className={cn("text-sm text-muted-foreground", "pt-2")}>
                    {t("dashboardTranslations.noPermissionsHint")}
                </div>
            ) : null}
        </div>
    );
}
