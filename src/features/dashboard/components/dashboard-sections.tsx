"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DashboardDateRangeFilter } from "@/features/dashboard/components/dashboard-date-range-filter";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { formatCurrency, formatDate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";

function statusBadgeVariant(
    status: string,
): "default" | "secondary" | "destructive" | "outline" {
    if (["completed", "ended"].includes(status)) return "secondary";
    if (["cancelled"].includes(status)) return "destructive";
    if (["preparing", "started"].includes(status)) return "default";
    return "outline";
}

export function RevenueTrendCard({
    snapshot,
    defaultRange,
}: {
    snapshot: DashboardSnapshot;
    defaultRange: { from: Date; to: Date };
}) {
    const { t } = useTranslation();

    console.log(snapshot.seriesRevenueTrend);

    const revenueConfig = {
        cafeRevenue: {
            label: t("dashboardTranslations.cafeRevenue"),
            color: "var(--chart-1)",
        },
        playgroundRevenue: {
            label: t("dashboardTranslations.playgroundRevenue"),
            color: "var(--chart-2)",
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle>{t("dashboardTranslations.revenueTrend")}</CardTitle>
                    <CardDescription>
                        {t("dashboardTranslations.fromToDate", {
                            from: defaultRange.from,
                            to: defaultRange.to,
                        })}
                    </CardDescription>
                </div>
                <DashboardDateRangeFilter
                    prefix="rev"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                <ChartContainer config={revenueConfig} className="h-[320px] w-full">
                    <LineChart
                        data={snapshot.seriesRevenueTrend}
                        margin={{ left: 12, right: 12 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => String(v).slice(5)}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={60}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) => (
                                        <div className="flex w-full justify-between gap-4">
                                            <span className="text-muted-foreground">
                                                {t(`dashboardTranslations.${name}` as any)}
                                            </span>
                                            <span className="font-mono tabular-nums font-medium">
                                                {formatCurrency(Number(value))}
                                            </span>
                                        </div>
                                    )}
                                />
                            }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line
                            type="monotone"
                            dataKey="cafeRevenue"
                            stroke="var(--color-cafeRevenue)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="playgroundRevenue"
                            stroke="var(--color-playgroundRevenue)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export function VolumeTrendCard({
    snapshot,
    defaultRange,
}: {
    snapshot: DashboardSnapshot;
    defaultRange: { from: Date; to: Date };
}) {
    const { t } = useTranslation();

    const volumeConfig = {
        orders: {
            label: t("dashboardTranslations.orders"),
            color: "var(--chart-3)",
        },
        reservations: {
            label: t("dashboardTranslations.reservations"),
            color: "var(--chart-4)",
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle>{t("dashboardTranslations.volumeTrend")}</CardTitle>
                    <CardDescription>
                        {t("dashboardTranslations.fromToDate", {
                            from: defaultRange.from,
                            to: defaultRange.to,
                        })}
                    </CardDescription>
                </div>
                <DashboardDateRangeFilter
                    prefix="vol"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                <ChartContainer config={volumeConfig} className="h-[320px] w-full">
                    <LineChart
                        data={snapshot.seriesVolumeTrend}
                        margin={{ left: 12, right: 12 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => String(v).slice(5)}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={40}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line
                            type="monotone"
                            dataKey="orders"
                            stroke="var(--color-orders)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="reservations"
                            stroke="var(--color-reservations)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export function TopProductsCard({
    snapshot,
    canViewOrders,
    defaultRange,
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
    defaultRange: { from: Date; to: Date };
}) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle>{t("dashboardTranslations.topProducts")}</CardTitle>
                    <CardDescription>
                        {t("dashboardTranslations.fromToDate", {
                            from: defaultRange.from,
                            to: defaultRange.to,
                        })}
                    </CardDescription>
                </div>
                <DashboardDateRangeFilter
                    prefix="top"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                {!canViewOrders ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noAccess")}
                    </div>
                ) : snapshot.topProductsLast30Days.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noDataYet")}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("dashboardTranslations.product")}</TableHead>
                                <TableHead>{t("dashboardTranslations.qty")}</TableHead>
                                <TableHead className="text-right">
                                    {t("dashboardTranslations.revenue")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshot.topProductsLast30Days.map((p) => (
                                <TableRow key={p.productId}>
                                    <TableCell className="max-w-[240px] truncate font-medium">
                                        {p.name}
                                    </TableCell>
                                    <TableCell className="font-mono tabular-nums">
                                        {p.qty.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">
                                        {formatCurrency(p.revenue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export function RecentOrdersCard({
    snapshot,
    canViewOrders,
    defaultRange,
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
    defaultRange: { from: Date; to: Date };
}) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle>{t("dashboardTranslations.recentOrders")}</CardTitle>
                    <CardDescription>
                        {t("dashboardTranslations.fromToDate", {
                            from: defaultRange.from,
                            to: defaultRange.to,
                        })}
                    </CardDescription>
                </div>
                <DashboardDateRangeFilter
                    prefix="ord"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                {!canViewOrders ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noAccess")}
                    </div>
                ) : snapshot.recentOrders.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noDataYet")}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("dashboardTranslations.order")}</TableHead>
                                <TableHead>{t("dashboardTranslations.status")}</TableHead>
                                <TableHead className="text-right">
                                    {t("dashboardTranslations.total")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshot.recentOrders.map((o) => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="font-mono">{o.orderNumber}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(o.createdAt, {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusBadgeVariant(o.status)}>
                                            {o.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">
                                        {formatCurrency(o.orderTotal)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export function UpcomingReservationsCard({
    snapshot,
    canViewReservations,
}: {
    snapshot: DashboardSnapshot;
    canViewReservations: boolean;
}) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle>
                        {t("dashboardTranslations.upcomingReservations")}
                    </CardTitle>
                    <CardDescription>
                        {t("dashboardTranslations.next24Hours")}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {!canViewReservations ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noAccess")}
                    </div>
                ) : snapshot.upcomingReservations.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.none")}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("dashboardTranslations.kid")}</TableHead>
                                <TableHead>{t("dashboardTranslations.time")}</TableHead>
                                <TableHead>{t("dashboardTranslations.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshot.upcomingReservations.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[220px]">
                                                {r.customerName}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {r.reservationCode}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDate(r.startTime, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusBadgeVariant(r.status)}>
                                            {r.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
