"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";

function formatPct(pct: number) {
    const rounded = Math.round(pct * 10) / 10;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}%`;
}

function KpiCard({
    title,
    value,
    subtext,
    trendPct,
    className,
}: {
    title: string;
    value: string;
    subtext?: string;
    trendPct?: number | null;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">{subtext}</div>
                    {typeof trendPct === "number" ? (
                        <Badge
                            variant={trendPct < 0 ? "destructive" : "secondary"}
                            className="font-mono tabular-nums"
                        >
                            {formatPct(trendPct)}
                        </Badge>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardHeader({
    canViewOrders,
    canViewReservations,
}: {
    canViewOrders: boolean;
    canViewReservations: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    {t("dashboardTranslations.dashboard")}
                </h1>
            </div>
            <div className="flex flex-wrap gap-2">
                {canViewOrders ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href="/orders">{t("dashboardTranslations.viewOrders")}</Link>
                    </Button>
                ) : null}
                {canViewReservations ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href="/reservations">
                            {t("dashboardTranslations.viewReservations")}
                        </Link>
                    </Button>
                ) : null}
                <Button asChild size="sm">
                    <Link href="/products">
                        {t("dashboardTranslations.viewProducts")}
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export function DashboardKpis({
    snapshot,
    canViewOrders,
    canViewReservations,
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
    canViewReservations: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                title={t("dashboardTranslations.revenueLast7Days")}
                value={formatCurrency(snapshot.kpis.totalRevenueLast7Days)}
                subtext={t("dashboardTranslations.vsPrevious7Days")}
                trendPct={snapshot.kpis.totalRevenueLast7DaysTrendPct}
            />
            <KpiCard
                title={t("dashboardTranslations.unpaidBalance")}
                value={formatCurrency(snapshot.kpis.unpaidBalanceOpen)}
                subtext={t("dashboardTranslations.openOrdersAndReservations")}
                className={
                    snapshot.kpis.unpaidBalanceOpen > 0
                        ? "border-destructive/40"
                        : undefined
                }
            />
            <KpiCard
                title={t("dashboardTranslations.ordersToday")}
                value={snapshot.kpis.ordersToday.toLocaleString()}
                subtext={
                    canViewOrders
                        ? t("dashboardTranslations.cafe")
                        : t("dashboardTranslations.noAccess")
                }
            />
            <KpiCard
                title={t("dashboardTranslations.activeKidsNow")}
                value={snapshot.kpis.activeKidsNow.toLocaleString()}
                subtext={
                    canViewReservations
                        ? t("dashboardTranslations.playground")
                        : t("dashboardTranslations.noAccess")
                }
            />
        </div>
    );
}
