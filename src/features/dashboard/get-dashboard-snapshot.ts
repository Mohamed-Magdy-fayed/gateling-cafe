import "server-only";

import {
    and,
    asc,
    between,
    count,
    desc,
    eq,
    gt,
    inArray,
    isNull,
    sql,
} from "drizzle-orm";

import { db } from "@/drizzle";
import {
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

function normalizeRange(range: { from: Date; to: Date }) {
    const from = startOfDay(clampToValidDate(range.from));
    const to = endOfDay(clampToValidDate(range.to));
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
        totalRevenueLast7Days: number;
        totalRevenueLast7DaysTrendPct: number | null;
        cafeRevenueLast7Days: number;
        playgroundRevenueLast7Days: number;
        unpaidBalanceOpen: number;
        ordersToday: number;
        reservationsToday: number;
        activeKidsNow: number;
    };
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
    topProductsLast30Days: Array<{
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
        revenueTrend: { from: Date; to: Date };
        volumeTrend: { from: Date; to: Date };
        topProducts: { from: Date; to: Date };
        recentOrders: { from: Date; to: Date };
        upcomingReservations: { from: Date; to: Date };
        kpisRevenue: { from: Date; to: Date };
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
    const prevKpisRevenueRange = {
        from: startOfDay(addDays(kpisRevenueRange.from, -kpiDays)),
        to: endOfDay(addDays(kpisRevenueRange.to, -kpiDays)),
    };

    const todayFrom = startOfDay(now);
    const todayTo = endOfDay(now);

    const revenueDays = Math.max(1, daysInclusive(revenueTrendRange.from, revenueTrendRange.to));
    const seriesRevenue = Array.from({ length: revenueDays }, (_, idx) => {
        const d = addDays(revenueTrendRange.from, idx);
        return {
            day: dayKey(d),
            cafeRevenue: 0,
            playgroundRevenue: 0,
            orders: 0,
            reservations: 0,
        };
    });

    const volumeDays = Math.max(1, daysInclusive(volumeTrendRange.from, volumeTrendRange.to));
    const seriesVolume = Array.from({ length: volumeDays }, (_, idx) => {
        const d = addDays(volumeTrendRange.from, idx);
        return {
            day: dayKey(d),
            cafeRevenue: 0,
            playgroundRevenue: 0,
            orders: 0,
            reservations: 0,
        };
    });

    const seriesRevenueMap = new Map(seriesRevenue.map((r) => [r.day, r] as const));
    const seriesVolumeMap = new Map(seriesVolume.map((r) => [r.day, r] as const));

    const cafeRevenueLast7Days = includeOrders
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${OrdersTable.totalPaid}), 0)`
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

    const cafeRevenuePrev7Days = includeOrders
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${OrdersTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(
                        OrdersTable.createdAt,
                        prevKpisRevenueRange.from,
                        prevKpisRevenueRange.to,
                    ),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const playgroundRevenueLast7Days = includeReservations
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${ReservationsTable.totalPaid}), 0)`
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

    const playgroundRevenuePrev7Days = includeReservations
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${ReservationsTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(
                        ReservationsTable.createdAt,
                        prevKpisRevenueRange.from,
                        prevKpisRevenueRange.to,
                    ),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const unpaidCafe = includeOrders
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${OrdersTable.orderTotal} - ${OrdersTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    inArray(OrdersTable.status, ["created", "preparing"]),
                    sql`${OrdersTable.orderTotal} > ${OrdersTable.totalPaid}`,
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const unpaidPlayground = includeReservations
        ? await db
            .select({
                value: sql<number>`coalesce(sum(${ReservationsTable.totalPrice} - ${ReservationsTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("value"),
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    inArray(ReservationsTable.status, ["reserved", "started"]),
                    sql`${ReservationsTable.totalPrice} > coalesce(${ReservationsTable.totalPaid}, 0)`,
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const ordersToday = includeOrders
        ? await db
            .select({ value: count().mapWith(Number).as("value") })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, todayFrom, todayTo),
                ),
            )
            .then((r) => r[0]?.value ?? 0)
        : 0;

    const reservationsToday = includeReservations
        ? await db
            .select({ value: count().mapWith(Number).as("value") })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(ReservationsTable.createdAt, todayFrom, todayTo),
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

    if (includeOrders) {
        const rows = await db
            .select({
                day: sql<Date>`date_trunc('day', ${OrdersTable.createdAt})`
                    .mapWith((v) => new Date(v as unknown as string))
                    .as("day"),
                revenue: sql<number>`coalesce(sum(${OrdersTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("revenue"),
                orders: count().mapWith(Number).as("orders"),
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, revenueTrendRange.from, revenueTrendRange.to),
                ),
            )
            .groupBy(sql`date_trunc('day', ${OrdersTable.createdAt})`)
            .orderBy(asc(sql`date_trunc('day', ${OrdersTable.createdAt})`));

        for (const row of rows) {
            const key = dayKey(row.day);
            const existing = seriesRevenueMap.get(key);
            if (!existing) continue;
            existing.cafeRevenue = row.revenue;
            existing.orders = row.orders;
        }

        const rowsVolume = await db
            .select({
                day: sql<Date>`date_trunc('day', ${OrdersTable.createdAt})`
                    .mapWith((v) => new Date(v as unknown as string))
                    .as("day"),
                orders: count().mapWith(Number).as("orders"),
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, volumeTrendRange.from, volumeTrendRange.to),
                ),
            )
            .groupBy(sql`date_trunc('day', ${OrdersTable.createdAt})`)
            .orderBy(asc(sql`date_trunc('day', ${OrdersTable.createdAt})`));

        for (const row of rowsVolume) {
            const key = dayKey(row.day);
            const existing = seriesVolumeMap.get(key);
            if (!existing) continue;
            existing.orders = row.orders;
        }
    }

    if (includeReservations) {
        const rows = await db
            .select({
                day: sql<Date>`date_trunc('day', ${ReservationsTable.createdAt})`
                    .mapWith((v) => new Date(v as unknown as string))
                    .as("day"),
                revenue: sql<number>`coalesce(sum(${ReservationsTable.totalPaid}), 0)`
                    .mapWith(Number)
                    .as("revenue"),
                reservations: count().mapWith(Number).as("reservations"),
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(
                        ReservationsTable.createdAt,
                        revenueTrendRange.from,
                        revenueTrendRange.to,
                    ),
                ),
            )
            .groupBy(sql`date_trunc('day', ${ReservationsTable.createdAt})`)
            .orderBy(asc(sql`date_trunc('day', ${ReservationsTable.createdAt})`));

        for (const row of rows) {
            const key = dayKey(row.day);
            const existing = seriesRevenueMap.get(key);
            if (!existing) continue;
            existing.playgroundRevenue = row.revenue;
            existing.reservations = row.reservations;
        }

        const rowsVolume = await db
            .select({
                day: sql<Date>`date_trunc('day', ${ReservationsTable.createdAt})`
                    .mapWith((v) => new Date(v as unknown as string))
                    .as("day"),
                reservations: count().mapWith(Number).as("reservations"),
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    between(
                        ReservationsTable.createdAt,
                        volumeTrendRange.from,
                        volumeTrendRange.to,
                    ),
                ),
            )
            .groupBy(sql`date_trunc('day', ${ReservationsTable.createdAt})`)
            .orderBy(asc(sql`date_trunc('day', ${ReservationsTable.createdAt})`));

        for (const row of rowsVolume) {
            const key = dayKey(row.day);
            const existing = seriesVolumeMap.get(key);
            if (!existing) continue;
            existing.reservations = row.reservations;
        }
    }

    const topProductsLast30Days = includeOrders
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
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(
                        OrdersTable.createdAt,
                        topProductsRange.from,
                        topProductsRange.to,
                    ),
                ),
            )
            .groupBy(ProductsTable.id, ProductsTable.name)
            .orderBy(desc(sql`coalesce(sum(${OrdersProductsTable.lineTotalCents}), 0)`))
            .limit(6)
        : [];

    const recentOrders = includeOrders
        ? await db
            .select({
                id: OrdersTable.id,
                orderNumber: OrdersTable.orderNumber,
                status: OrdersTable.status,
                orderTotal: OrdersTable.orderTotal,
                totalPaid: OrdersTable.totalPaid,
                createdAt: OrdersTable.createdAt,
            })
            .from(OrdersTable)
            .where(
                and(
                    isNull(OrdersTable.deletedAt),
                    between(OrdersTable.createdAt, recentOrdersRange.from, recentOrdersRange.to),
                ),
            )
            .orderBy(desc(OrdersTable.createdAt))
            .limit(8)
            .then((rows) =>
                rows.map((r) => ({
                    ...r,
                    status: String(r.status),
                    createdAt: new Date(r.createdAt).toISOString(),
                })),
            )
        : [];

    const upcomingReservations = includeReservations
        ? await db
            .select({
                id: ReservationsTable.id,
                reservationCode: ReservationsTable.reservationCode,
                customerName: ReservationsTable.customerName,
                status: ReservationsTable.status,
                startTime: ReservationsTable.startTime,
                endTime: ReservationsTable.endTime,
                totalPrice: ReservationsTable.totalPrice,
                totalPaid: ReservationsTable.totalPaid,
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    inArray(ReservationsTable.status, ["reserved", "started"]),
                    between(
                        ReservationsTable.startTime,
                        upcomingReservationsRange.from,
                        upcomingReservationsRange.to,
                    ),
                ),
            )
            .orderBy(asc(ReservationsTable.startTime), asc(ReservationsTable.endTime))
            .limit(8)
            .then((rows) =>
                rows.map((r) => ({
                    ...r,
                    status: String(r.status),
                    startTime: new Date(r.startTime).toISOString(),
                    endTime: new Date(r.endTime).toISOString(),
                    totalPaid: r.totalPaid ?? 0,
                })),
            )
        : [];

    const totalRevenueLast7Days = cafeRevenueLast7Days + playgroundRevenueLast7Days;
    const totalRevenuePrev7Days = cafeRevenuePrev7Days + playgroundRevenuePrev7Days;

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
            totalRevenueLast7Days,
            totalRevenueLast7DaysTrendPct: trendPercent(
                totalRevenueLast7Days,
                totalRevenuePrev7Days,
            ),
            cafeRevenueLast7Days,
            playgroundRevenueLast7Days,
            unpaidBalanceOpen: unpaidCafe + unpaidPlayground,
            ordersToday,
            reservationsToday,
            activeKidsNow,
        },
        seriesRevenueTrend: seriesRevenue,
        seriesVolumeTrend: seriesVolume,
        topProductsLast30Days,
        recentOrders,
        upcomingReservations,
    };
}
