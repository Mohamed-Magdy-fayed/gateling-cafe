import "server-only";

import {
    and,
    between,
    count,
    desc,
    eq,
    gt,
    isNull,
    sql,
} from "drizzle-orm";

import { db } from "@/drizzle";
import {
    DailyCashClosuresTable,
    OrdersProductsTable,
    OrdersTable,
    ProductsTable,
    ReservationsTable,
} from "@/drizzle/schema";

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
    );
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function dayKey(date: Date) {
    // YYYY-MM-DD
    return date.toISOString().slice(0, 10);
}

function trendPercent(current: number, previous: number) {
    if (previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}

function clampToValidDate(date: Date) {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

type RangeInput = { from: Date; to: Date; preserveTime?: boolean };

function normalizeRange(range: RangeInput) {
    const rawFrom = clampToValidDate(range.from);
    const rawTo = clampToValidDate(range.to);

    const from = range.preserveTime ? rawFrom : startOfDay(rawFrom);
    const to = range.preserveTime ? rawTo : endOfDay(rawTo);

    return from.getTime() <= to.getTime() ? { from, to } : { from: to, to: from };
}

function daysInclusive(from: Date, to: Date) {
    const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export type DashboardSnapshot = {
    range: {
        revenueTrend: { from: string; to: string };
        volumeTrend: { from: string; to: string };
        topProducts: { from: string; to: string };
        recentOrders: { from: string; to: string };
        upcomingReservations: { from: string; to: string };
        kpisRevenue: { from: string; to: string };
    };
    kpis: {
        totalRevenueInRange: number;
        reservationsRevenueInRange: number;
        ordersRevenueInRange: number;
        reservationsCountInRange: number;
        ordersCountInRange: number;
        activeKidsNow: number;
    };
    dayClosure: {
        id: string;
        closedDate: string;
        openedAt: string;
        openedBy: string;
        closedAt: string | null;
        closedBy: string | null;
        expectedOrdersCents: number | null;
        expectedReservationsCents: number | null;
        expectedTotalCents: number | null;
        actualCashCents: number | null;
        differenceCents: number | null;
        notes: string | null;
        createdBy: string;
        createdAt: string;
    } | null;
    shiftHistory: Array<{
        id: string;
        openedAt: string;
        openedBy: string;
        closedAt: string;
        closedBy: string | null;
        expectedTotalCents: number | null;
        actualCashCents: number | null;
        differenceCents: number | null;
        notes: string | null;
    }>;
    seriesRevenueTrend: Array<{
        day: string;
        cafeRevenue: number;
        playgroundRevenue: number;
        orders: number;
        reservations: number;
    }>;
    seriesVolumeTrend: Array<{
        day: string;
        cafeRevenue: number;
        playgroundRevenue: number;
        orders: number;
        reservations: number;
    }>;
    topProducts: Array<{
        productId: string;
        name: string;
        qty: number;
        revenue: number;
    }>;
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        orderTotal: number;
        totalPaid: number;
        createdAt: string;
    }>;
    upcomingReservations: Array<{
        id: string;
        reservationCode: string;
        customerName: string;
        status: string;
        startTime: string;
        endTime: string;
        totalPrice: number;
        totalPaid: number;
    }>;
};

export async function getDashboardSnapshot({
    includeOrders,
    includeReservations,
    ranges,
}: {
    includeOrders: boolean;
    includeReservations: boolean;
    ranges: {
        revenueTrend: RangeInput;
        volumeTrend: RangeInput;
        topProducts: RangeInput;
        recentOrders: RangeInput;
        upcomingReservations: RangeInput;
        kpisRevenue: RangeInput;
    };
}): Promise<DashboardSnapshot> {
    const now = new Date();

    const revenueTrendRange = normalizeRange(ranges.revenueTrend);
    const volumeTrendRange = normalizeRange(ranges.volumeTrend);
    const topProductsRange = normalizeRange(ranges.topProducts);
    const recentOrdersRange = normalizeRange(ranges.recentOrders);
    const upcomingReservationsRange = normalizeRange(ranges.upcomingReservations);
    const kpisRevenueRange = normalizeRange(ranges.kpisRevenue);

    const kpiDays = Math.max(1, daysInclusive(kpisRevenueRange.from, kpisRevenueRange.to));

    const seriesRevenue: DashboardSnapshot["seriesRevenueTrend"] = [];
    const seriesVolume: DashboardSnapshot["seriesVolumeTrend"] = [];

    const ordersRevenueInRange = includeOrders
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${OrdersTable.orderTotal}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, kpisRevenueRange.from, kpisRevenueRange.to),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const reservationsRevenueInRange = includeReservations
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${ReservationsTable.totalPrice}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(
                        ReservationsTable.createdAt,
                        kpisRevenueRange.from,
                        kpisRevenueRange.to,
                    ),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const ordersCountInRange = includeOrders
        ? await db
            .select({ value: count().mapWith(Number).as("value") })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, kpisRevenueRange.from, kpisRevenueRange.to),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const reservationsCountInRange = includeReservations
        ? await db
            .select({ value: count().mapWith(Number).as("value") })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(
                        ReservationsTable.createdAt,
                        kpisRevenueRange.from,
                        kpisRevenueRange.to,
                    ),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const activeKidsNow = includeReservations
        ? await db
            .select({ value: count().mapWith(Number).as("value") })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    eq(ReservationsTable.status, "started"),
                    gt(ReservationsTable.endTime, now),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const activeShift = includeOrders || includeReservations
        ? await db.query.DailyCashClosuresTable.findFirst({
            where: and(
                isNull(DailyCashClosuresTable.closedAt),
                isNull(DailyCashClosuresTable.deletedAt),
            ),
        })
        : null;

    let shiftOrdersTotal = 0;
    let shiftReservationsTotal = 0;

    if (activeShift) {
        const shiftStart = activeShift.openedAt;
        const shiftEnd = now;

        if (includeOrders) {
            shiftOrdersTotal = await db
                .select({
                    value: sql<number>`coalesce(sum(${OrdersTable.orderTotal}), 0)`
                        .mapWith(Number)
                        .as("value"),
                })
                .from(OrdersTable)
                .where(
                    and(
                        isNull(OrdersTable.deletedAt),
                        between(OrdersTable.createdAt, shiftStart, shiftEnd),
                    ),
                )
                .then((r) => r[0]?.value ?? 0);
        }

        if (includeReservations) {
            shiftReservationsTotal = await db
                .select({
                    value: sql<number>`coalesce(sum(${ReservationsTable.totalPrice}), 0)`
                        .mapWith(Number)
                        .as("value"),
                })
                .from(ReservationsTable)
                .where(
                    and(
                        isNull(ReservationsTable.deletedAt),
                        between(ReservationsTable.createdAt, shiftStart, shiftEnd),
                    ),
                )
                .then((r) => r[0]?.value ?? 0);
        }
    }

    const dayClosureRecord = activeShift
        ? {
            ...activeShift,
            expectedOrdersCents: includeOrders ? shiftOrdersTotal : null,
            expectedReservationsCents: includeReservations ? shiftReservationsTotal : null,
            expectedTotalCents: shiftOrdersTotal + shiftReservationsTotal,
        }
        : null;

    // Trend data omitted in simplified dashboard

    const topProducts = includeOrders
        ? await db
            .select({
                productId: ProductsTable.id,
                name: ProductsTable.name,
                qty: sql<number>`coalesce(sum(${OrdersProductsTable.qty}), 0)`
                    .mapWith(Number)
                    .as("qty"),
                revenue: sql<number>`coalesce(sum(${OrdersProductsTable.lineTotalCents}), 0)`
                    .mapWith(Number)
                    .as("revenue"),
            })
            .from(OrdersProductsTable)
            .innerJoin(OrdersTable, eq(OrdersProductsTable.orderId, OrdersTable.id))
            .innerJoin(
                ProductsTable,
                eq(OrdersProductsTable.productId, ProductsTable.id),
            )
            .where(isNull(OrdersTable.deletedAt))
            .groupBy(ProductsTable.id, ProductsTable.name)
            .orderBy(desc(sql`coalesce(sum(${OrdersProductsTable.lineTotalCents}), 0)`))
            .limit(6)
        : [];

    const recentOrders: DashboardSnapshot["recentOrders"] = [];

    const upcomingReservations: DashboardSnapshot["upcomingReservations"] = [];

    return {
        range: {
            revenueTrend: {
                from: revenueTrendRange.from.toISOString(),
                to: revenueTrendRange.to.toISOString(),
            },
            volumeTrend: {
                from: volumeTrendRange.from.toISOString(),
                to: volumeTrendRange.to.toISOString(),
            },
            topProducts: {
                from: topProductsRange.from.toISOString(),
                to: topProductsRange.to.toISOString(),
            },
            recentOrders: {
                from: recentOrdersRange.from.toISOString(),
                to: recentOrdersRange.to.toISOString(),
            },
            upcomingReservations: {
                from: upcomingReservationsRange.from.toISOString(),
                to: upcomingReservationsRange.to.toISOString(),
            },
            kpisRevenue: {
                from: kpisRevenueRange.from.toISOString(),
                to: kpisRevenueRange.to.toISOString(),
            },
        },
        kpis: {
            totalRevenueInRange: ordersRevenueInRange + reservationsRevenueInRange,
            reservationsRevenueInRange,
            ordersRevenueInRange,
            reservationsCountInRange,
            ordersCountInRange,
            activeKidsNow,
        },
        dayClosure: dayClosureRecord
            ? {
                id: dayClosureRecord.id,
                closedDate: new Date(dayClosureRecord.closedDate).toISOString(),
                openedAt: dayClosureRecord.openedAt.toISOString(),
                openedBy: dayClosureRecord.openedBy,
                closedAt: dayClosureRecord.closedAt?.toISOString() ?? null,
                closedBy: dayClosureRecord.closedBy ?? null,
                expectedOrdersCents: dayClosureRecord.expectedOrdersCents,
                expectedReservationsCents: dayClosureRecord.expectedReservationsCents,
                expectedTotalCents: dayClosureRecord.expectedTotalCents,
                actualCashCents: dayClosureRecord.actualCashCents,
                differenceCents: dayClosureRecord.differenceCents,
                notes: dayClosureRecord.notes ?? null,
                createdBy: dayClosureRecord.createdBy,
                createdAt: dayClosureRecord.createdAt.toISOString(),
            }
            : null,
        shiftHistory: [],
        seriesRevenueTrend: seriesRevenue,
        seriesVolumeTrend: seriesVolume,
        topProducts,
        recentOrders,
        upcomingReservations,
    };
}
