"use client";

import { DashboardHeader, DashboardKpis } from "@/features/dashboard/components/dashboard-kpis";
import {
    RecentOrdersCard,
    RevenueTrendCard,
    TopProductsCard,
    UpcomingReservationsCard,
    VolumeTrendCard,
} from "@/features/dashboard/components/dashboard-sections";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export function DashboardClient({
    snapshot,
    canViewOrders,
    canViewReservations,
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
    canViewReservations: boolean;
}) {
    const { t } = useTranslation();

    const defaultRevenueTrend = {
        from: new Date(snapshot.range.revenueTrend.from),
        to: new Date(snapshot.range.revenueTrend.to),
    };
    const defaultVolumeTrend = {
        from: new Date(snapshot.range.volumeTrend.from),
        to: new Date(snapshot.range.volumeTrend.to),
    };
    const defaultTopProducts = {
        from: new Date(snapshot.range.topProducts.from),
        to: new Date(snapshot.range.topProducts.to),
    };
    const defaultRecentOrders = {
        from: new Date(snapshot.range.recentOrders.from),
        to: new Date(snapshot.range.recentOrders.to),
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <DashboardHeader
                canViewOrders={canViewOrders}
                canViewReservations={canViewReservations}
            />

            <DashboardKpis
                snapshot={snapshot}
                canViewOrders={canViewOrders}
                canViewReservations={canViewReservations}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <RevenueTrendCard snapshot={snapshot} defaultRange={defaultRevenueTrend} />
                <VolumeTrendCard snapshot={snapshot} defaultRange={defaultVolumeTrend} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <TopProductsCard
                    snapshot={snapshot}
                    canViewOrders={canViewOrders}
                    defaultRange={defaultTopProducts}
                />

                <div className="space-y-4">
                    <RecentOrdersCard
                        snapshot={snapshot}
                        canViewOrders={canViewOrders}
                        defaultRange={defaultRecentOrders}
                    />
                    <UpcomingReservationsCard
                        snapshot={snapshot}
                        canViewReservations={canViewReservations}
                    />
                </div>
            </div>

            {!canViewOrders && !canViewReservations ? (
                <div className={cn("text-sm text-muted-foreground", "pt-2")}>
                    {t("dashboardTranslations.noPermissionsHint")}
                </div>
            ) : null}
        </div>
    );
}
