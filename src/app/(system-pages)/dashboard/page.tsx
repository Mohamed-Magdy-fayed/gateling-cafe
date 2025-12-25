import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { getDashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";

type DashboardPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function parseMs(value: string | string[] | undefined) {
    const v = firstParam(value);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addHours(date: Date, hours: number) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
}

function getRangeFromSearchParams(
    searchParams: Awaited<DashboardPageProps["searchParams"]>,
    prefix: string,
    fallback: { from: Date; to: Date },
) {
    const fromMs = parseMs(searchParams?.[`${prefix}From`]);
    const toMs = parseMs(searchParams?.[`${prefix}To`]);

    return {
        from: fromMs ? new Date(fromMs) : fallback.from,
        to: toMs ? new Date(toMs) : fallback.to,
    };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const searchParamsResolved = await searchParams;
    const user = await getCurrentUser({ redirectIfNotFound: true });

    const canViewOrders = hasPermission(user, "orders", "view");
    const canViewReservations = hasPermission(user, "reservations", "view");

    const now = new Date();

    const last30Days = { from: addDays(now, -29), to: now };
    const last7Days = { from: addDays(now, -6), to: now };
    const next24Hours = { from: now, to: addHours(now, 24) };

    const ranges = {
        revenueTrend: getRangeFromSearchParams(searchParamsResolved, "rev", last30Days),
        volumeTrend: getRangeFromSearchParams(searchParamsResolved, "vol", last30Days),
        topProducts: getRangeFromSearchParams(searchParamsResolved, "top", last30Days),
        recentOrders: getRangeFromSearchParams(searchParamsResolved, "ord", last7Days),
        upcomingReservations: getRangeFromSearchParams(searchParamsResolved, "res", next24Hours),
        kpisRevenue: getRangeFromSearchParams(searchParamsResolved, "kpi", last7Days),
    };

    const snapshot = await getDashboardSnapshot({
        includeOrders: canViewOrders,
        includeReservations: canViewReservations,
        ranges,
    });

    return (
        <DashboardClient
            snapshot={snapshot}
            canViewOrders={canViewOrders}
            canViewReservations={canViewReservations}
        />
    );
}
