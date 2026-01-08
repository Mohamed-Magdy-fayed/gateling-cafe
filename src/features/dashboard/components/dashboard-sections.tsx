"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { DataTable } from "@/components/data-table/data-table";
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
import { DashboardDateRangeFilter } from "@/features/dashboard/components/dashboard-date-range-filter";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { useDataTable } from "@/hooks/use-data-table";
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
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.revenueTrend")}</CardTitle>
                <CardDescription>
                    {t("dashboardTranslations.fromToDate", {
                        from: defaultRange.from,
                        to: defaultRange.to,
                    })}
                </CardDescription>
                <DashboardDateRangeFilter
                    prefix="rev"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                <ChartContainer config={revenueConfig} className="w-full">
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
                                    formatter={(value, name) => {
                                        const key = typeof name === "string" ? name : String(name);
                                        const label =
                                            typeof name === "string"
                                                ? revenueConfig[
                                                    name as keyof typeof revenueConfig
                                                ]?.label ?? key
                                                : key;

                                        return (
                                            <div className="flex w-full justify-between gap-4">
                                                <span className="text-muted-foreground">
                                                    {label}
                                                </span>
                                                <span className="font-mono tabular-nums font-medium">
                                                    {formatCurrency(Number(value))}
                                                </span>
                                            </div>
                                        );
                                    }}
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
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.volumeTrend")}</CardTitle>
                <CardDescription>
                    {t("dashboardTranslations.fromToDate", {
                        from: defaultRange.from,
                        to: defaultRange.to,
                    })}
                </CardDescription>
                <DashboardDateRangeFilter
                    prefix="vol"
                    title={t("common.selectDateRange")}
                    defaultRange={defaultRange}
                />
            </CardHeader>
            <CardContent>
                <ChartContainer config={volumeConfig}>
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
}: {
    snapshot: DashboardSnapshot;
    canViewOrders: boolean;
}) {
    const { t } = useTranslation();
    const topProductsColumns = useMemo<
        ColumnDef<DashboardSnapshot["topProducts"][number]>[]
    >(
        () => [
            {
                accessorKey: "name",
                header: t("dashboardTranslations.product"),
                cell: ({ row }) => (
                    <span className="max-w-[240px] truncate font-medium">
                        {row.original.name}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "qty",
                header: t("dashboardTranslations.qty"),
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {row.original.qty.toLocaleString()}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "revenue",
                header: () => (
                    <div className="text-right">{t("dashboardTranslations.revenue")}</div>
                ),
                cell: ({ row }) => (
                    <span className="block text-right font-mono tabular-nums">
                        {formatCurrency(row.original.revenue)}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
        ],
        [t],
    );

    const topProductsData = snapshot.topProducts;
    const { table: topProductsTable } = useDataTable({
        columns: topProductsColumns,
        data: topProductsData,
        enableRowSelection: false,
        initialState: {
            sorting: [{ id: "revenue", desc: true }],
            pagination: {
                pageIndex: 0,
                pageSize: Math.max(topProductsData.length, 5),
            },
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.topProducts")}</CardTitle>
                <CardDescription>{t("dashboardTranslations.allTime")}</CardDescription>
            </CardHeader>
            <CardContent>
                {!canViewOrders ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noAccess")}
                    </div>
                ) : topProductsData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noDataYet")}
                    </div>
                ) : (
                    <DataTable className="w-auto" table={topProductsTable} hidePagination />
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
    const recentOrdersColumns = useMemo<
        ColumnDef<DashboardSnapshot["recentOrders"][number]>[]
    >(
        () => [
            {
                accessorKey: "orderNumber",
                header: t("dashboardTranslations.order"),
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-mono">{row.original.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(row.original.createdAt, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "status",
                header: t("dashboardTranslations.status"),
                cell: ({ row }) => (
                    <Badge variant={statusBadgeVariant(row.original.status)}>
                        {row.original.status}
                    </Badge>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "orderTotal",
                header: () => (
                    <div className="text-right">{t("dashboardTranslations.total")}</div>
                ),
                cell: ({ row }) => (
                    <span className="block text-right font-mono tabular-nums">
                        {formatCurrency(row.original.orderTotal)}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
        ],
        [t],
    );

    const recentOrdersData = snapshot.recentOrders;
    const { table: recentOrdersTable } = useDataTable({
        columns: recentOrdersColumns,
        data: recentOrdersData,
        enableRowSelection: false,
        initialState: {
            sorting: [{ id: "orderTotal", desc: true }],
            pagination: {
                pageIndex: 0,
                pageSize: Math.max(recentOrdersData.length, 5),
            },
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.recentOrders")}</CardTitle>
                <CardDescription>
                    {t("dashboardTranslations.fromToDate", {
                        from: defaultRange.from,
                        to: defaultRange.to,
                    })}
                </CardDescription>
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
                ) : recentOrdersData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noDataYet")}
                    </div>
                ) : (
                    <DataTable className="w-min" table={recentOrdersTable} hidePagination />
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
    const upcomingReservationsColumns = useMemo<
        ColumnDef<DashboardSnapshot["upcomingReservations"][number]>[]
    >(
        () => [
            {
                accessorKey: "customerName",
                header: t("dashboardTranslations.kid"),
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="max-w-[220px] truncate">
                            {row.original.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                            {row.original.reservationCode}
                        </span>
                    </div>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "startTime",
                header: t("dashboardTranslations.time"),
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(row.original.startTime, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "status",
                header: t("dashboardTranslations.status"),
                cell: ({ row }) => (
                    <Badge variant={statusBadgeVariant(row.original.status)}>
                        {row.original.status}
                    </Badge>
                ),
                enableSorting: false,
                enableHiding: false,
            },
        ],
        [t],
    );

    const upcomingReservationsData = snapshot.upcomingReservations;
    const { table: upcomingReservationsTable } = useDataTable({
        columns: upcomingReservationsColumns,
        data: upcomingReservationsData,
        enableRowSelection: false,
        initialState: {
            sorting: [{ id: "startTime", desc: false }],
            pagination: {
                pageIndex: 0,
                pageSize: Math.max(upcomingReservationsData.length, 5),
            },
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.upcomingReservations")}</CardTitle>
                <CardDescription>
                    {t("dashboardTranslations.next24Hours")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!canViewReservations ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.noAccess")}
                    </div>
                ) : upcomingReservationsData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.none")}
                    </div>
                ) : (
                    <DataTable table={upcomingReservationsTable} hidePagination />
                )}
            </CardContent>
        </Card>
    );
}

export function ShiftHistoryCard({
    history,
}: {
    history: DashboardSnapshot["shiftHistory"];
}) {
    const { t } = useTranslation();
    const formatDateShort = useCallback(
        (value: string) =>
            formatDate(value, {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
        [],
    );

    const formatTime = useCallback((value: string) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(value));
        } catch (_error) {
            return value;
        }
    }, []);

    const getVarianceMeta = useCallback(
        (difference: number | null) => {
            if (difference == null || difference === 0) {
                return {
                    label: t("dashboardTranslations.balanced"),
                    className: "text-muted-foreground",
                };
            }

            if (difference < 0) {
                return {
                    label: t("dashboardTranslations.shortfall"),
                    className: "text-destructive",
                };
            }

            return {
                label: t("dashboardTranslations.overage"),
                className: "text-emerald-600",
            };
        },
        [t],
    );

    const shiftHistoryColumns = useMemo<
        ColumnDef<DashboardSnapshot["shiftHistory"][number]>[]
    >(
        () => [
            {
                id: "shift",
                header: t("dashboardTranslations.shiftHistoryShiftColumn"),
                cell: ({ row }) => (
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                            {formatDateShort(row.original.closedAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {`${formatTime(row.original.openedAt)} → ${formatTime(row.original.closedAt)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {t("dashboardTranslations.dayOpenedBy", {
                                by: row.original.openedBy,
                            })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {row.original.closedBy
                                ? t("dashboardTranslations.closedBy", {
                                    by: row.original.closedBy,
                                })
                                : t("dashboardTranslations.closedBy", {
                                    by: t("dashboardTranslations.none"),
                                })}
                        </span>
                    </div>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "expectedTotalCents",
                header: t("dashboardTranslations.shiftHistoryExpected"),
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {row.original.expectedTotalCents != null
                            ? formatCurrency(row.original.expectedTotalCents)
                            : "--"}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "actualCashCents",
                header: t("dashboardTranslations.shiftHistoryActual"),
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {row.original.actualCashCents != null
                            ? formatCurrency(row.original.actualCashCents)
                            : "--"}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "differenceCents",
                header: t("dashboardTranslations.shiftHistoryVariance"),
                cell: ({ row }) => {
                    const difference = row.original.differenceCents;
                    if (difference == null) {
                        return <span>--</span>;
                    }

                    const varianceMeta = getVarianceMeta(difference);

                    return (
                        <div className="flex flex-col gap-1">
                            <span className="font-mono tabular-nums">
                                {formatCurrency(Math.abs(difference))}
                            </span>
                            <span className={`text-xs font-medium ${varianceMeta.className}`}>
                                {varianceMeta.label}
                            </span>
                        </div>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "notes",
                header: t("dashboardTranslations.notes"),
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">
                        {row.original.notes ?? "--"}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
            },
        ],
        [formatDateShort, formatTime, getVarianceMeta, t],
    );

    const { table: shiftHistoryTable } = useDataTable({
        columns: shiftHistoryColumns,
        data: history,
        enableRowSelection: false,
        initialState: {
            sorting: [],
            pagination: {
                pageIndex: 0,
                pageSize: Math.max(history.length, 5),
            },
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("dashboardTranslations.shiftHistoryTitle")}</CardTitle>
                <CardDescription>
                    {t("dashboardTranslations.shiftHistorySubtitle")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {history.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.shiftHistoryEmpty")}
                    </div>
                ) : (
                    <DataTable className="w-[calc(100vw-8rem)] md:w-auto" table={shiftHistoryTable} hidePagination />
                )}
            </CardContent>
        </Card>
    );
}
