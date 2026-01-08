"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { closeDayAction, openDayAction } from "@/features/dashboard/actions";
import { DashboardDateRangeFilter } from "@/features/dashboard/components/dashboard-date-range-filter";
import type { DashboardSnapshot } from "@/features/dashboard/get-dashboard-snapshot";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";

type KpiCardProps = {
    title: string;
    value: string;
    subtext?: string;
};

function KpiCard({ title, value, subtext }: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            {subtext ? (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                    {subtext}
                </CardContent>
            ) : null}
        </Card>
    );
}

type DualStatCardProps = {
    title: string;
    primary: string;
    secondaryLabel: string;
    secondary: string;
    disabled?: boolean;
};

function DualStatCard({
    title,
    primary,
    secondaryLabel,
    secondary,
    disabled,
}: DualStatCardProps) {
    const { t } = useTranslation();

    return (
        <Card className={disabled ? "opacity-60" : undefined}>
            <CardHeader className="pb-1">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-2xl">
                    {disabled ? t("dashboardTranslations.noAccess") : primary}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {secondaryLabel}
                    </span>
                    <span className="justify-self-end font-medium text-foreground">
                        {disabled ? "--" : secondary}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardHeader({
    defaultRange,
    shiftRange,
}: {
    defaultRange: { from: Date; to: Date };
    shiftRange?: { from: Date; to: Date } | null;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    {t("dashboardTranslations.dashboard")}
                </h1>
            </div>
            <DashboardDateRangeFilter
                prefix="kpi"
                title={t("common.selectDateRange")}
                defaultRange={defaultRange}
                shiftRange={shiftRange ?? undefined}
                shiftLabel={t("dashboardTranslations.currentShift")}
            />
        </div>
    );
}

export function DayClosingCard({
    snapshot,
    canCloseDay,
}: {
    snapshot: DashboardSnapshot;
    canCloseDay: boolean;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, startTransition] = useTransition();

    const defaultActual =
        snapshot.dayClosure?.actualCashCents ??
        snapshot.dayClosure?.expectedTotalCents ??
        null;
    const [actualCash, setActualCash] = useState<number | null>(defaultActual);
    const [notes, setNotes] = useState(snapshot.dayClosure?.notes ?? "");

    const expectedTotal = snapshot.dayClosure?.expectedTotalCents ?? 0;
    const closure = snapshot.dayClosure;

    const variance =
        closure && closure.differenceCents != null ? closure.differenceCents : 0;

    const varianceLabel =
        variance < 0
            ? t("dashboardTranslations.shortfall")
            : variance > 0
                ? t("dashboardTranslations.overage")
                : t("dashboardTranslations.balanced");

    const varianceClass =
        variance < 0
            ? "text-destructive"
            : variance > 0
                ? "text-emerald-600"
                : "text-muted-foreground";

    const handleOpenDay = () => {
        startTransition(async () => {
            const result = await openDayAction();
            if (result.error) {
                toast.error(result.message || t("dashboardTranslations.openDayError"));
                return;
            }

            toast.success(t("dashboardTranslations.dayOpenedSuccess"));
            router.refresh();
        });
    };

    const handleSubmit = () => {
        if (actualCash == null) {
            toast.error(t("dashboardTranslations.actualCashRequired"));
            return;
        }

        startTransition(async () => {
            const result = await closeDayAction({
                actualCashCents: Math.max(0, Math.round(actualCash)),
                notes,
            });

            if (result.error) {
                toast.error(result.message || t("dashboardTranslations.closeDayError"));
                return;
            }

            toast.success(t("dashboardTranslations.dayClosedSuccess"));
            setDialogOpen(false);
            router.refresh();
        });
    };

    return (
        <Card className="border-primary/30 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardDescription>
                        {t("dashboardTranslations.closeDayDescription")}
                    </CardDescription>
                    <CardTitle>{t("dashboardTranslations.closeDayTitle")}</CardTitle>
                </div>
                <Badge variant={closure ? "secondary" : "outline"}>
                    {closure
                        ? t("dashboardTranslations.pendingClosure")
                        : t("dashboardTranslations.noActiveShift")}
                </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.expectedCashTotal", {
                            amount: closure ? formatCurrency(expectedTotal) : "--",
                        })}
                    </div>
                    <div className={`text-sm font-medium ${varianceClass}`}>
                        {t("dashboardTranslations.cashVariance")}:{" "}
                        {closure
                            ? `${formatCurrency(Math.abs(variance))} · ${varianceLabel}`
                            : "--"}
                    </div>
                </div>

                {closure ? (
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <div className="font-semibold text-foreground">
                            {t("dashboardTranslations.dayOpenedBy", { by: closure.openedBy })}
                        </div>
                        <div className="text-foreground">
                            {closure.closedAt
                                ? t("dashboardTranslations.actualCashCollected") +
                                ": " +
                                formatCurrency(closure.actualCashCents ?? 0)
                                : t("dashboardTranslations.dayOpenPendingClose")}
                        </div>
                        {closure.closedAt && (
                            <div>
                                {t("dashboardTranslations.closedBy", {
                                    by: closure.closedBy ?? "",
                                })}
                            </div>
                        )}
                        {closure.notes ? (
                            <div className="mt-2 whitespace-pre-wrap">
                                {t("dashboardTranslations.notes")}: {closure.notes}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.closeDayHelper")}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex items-center justify-end gap-2 mt-auto">
                {!closure && (
                    <Button
                        disabled={!canCloseDay || isSubmitting}
                        onClick={handleOpenDay}
                    >
                        {t("dashboardTranslations.openDayButton")}
                    </Button>
                )}

                {closure && !closure.closedAt ? (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!canCloseDay}>
                                {t("dashboardTranslations.closeDayButton")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {t("dashboardTranslations.closeDayTitle")}
                                </DialogTitle>
                                <DialogDescription>
                                    {t("dashboardTranslations.closeDayDialogHint", {
                                        expected: formatCurrency(expectedTotal),
                                    })}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="actual-cash">
                                        {t("dashboardTranslations.actualCashCollected")}
                                    </Label>
                                    <NumberInput
                                        id="actual-cash"
                                        min={0}
                                        value={actualCash}
                                        onChange={setActualCash}
                                        placeholder={t(
                                            "dashboardTranslations.actualCashPlaceholder",
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="closure-notes">
                                        {t("dashboardTranslations.notes")}
                                    </Label>
                                    <Textarea
                                        id="closure-notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t(
                                            "dashboardTranslations.closeDayNotePlaceholder",
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    {t("dashboardTranslations.cancel")}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || actualCash == null}
                                >
                                    {isSubmitting
                                        ? t("dashboardTranslations.saving")
                                        : t("dashboardTranslations.saveClosure")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : null}
            </CardFooter>
        </Card>
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

    const rangeLabel = useMemo(() => {
        const from = new Date(snapshot.range.kpisRevenue.from);
        const to = new Date(snapshot.range.kpisRevenue.to);

        const isAllTime = from.getTime() <= 24 * 60 * 60 * 1000;
        if (isAllTime) return "";

        try {
            const formatter = new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            return `${formatter.format(from)} – ${formatter.format(to)}`;
        } catch (_e) {
            return `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;
        }
    }, [snapshot.range.kpisRevenue.from, snapshot.range.kpisRevenue.to]);

    const cards = useMemo(
        () => [
            {
                title: t("dashboardTranslations.totalIncome"),
                value: formatCurrency(snapshot.kpis.totalRevenueInRange),
                subtext: rangeLabel
                    ? t("dashboardTranslations.rangeSelected", { range: rangeLabel })
                    : t("dashboardTranslations.allTime"),
            },
            {
                title: t("dashboardTranslations.activeKidsNow"),
                value: snapshot.kpis.activeKidsNow.toLocaleString(),
                subtext: t("dashboardTranslations.liveInsidePlayground"),
            },
        ],
        [
            rangeLabel,
            snapshot.kpis.activeKidsNow,
            snapshot.kpis.totalRevenueInRange,
            t,
        ],
    );

    const dualCards = useMemo(
        () => [
            {
                title: t("dashboardTranslations.reservationsIncome"),
                primary: formatCurrency(snapshot.kpis.reservationsRevenueInRange),
                secondaryLabel: t("dashboardTranslations.reservationsCount"),
                secondary: snapshot.kpis.reservationsCountInRange.toLocaleString(),
                disabled: !canViewReservations,
            },
            {
                title: t("dashboardTranslations.ordersIncome"),
                primary: formatCurrency(snapshot.kpis.ordersRevenueInRange),
                secondaryLabel: t("dashboardTranslations.ordersCount"),
                secondary: snapshot.kpis.ordersCountInRange.toLocaleString(),
                disabled: !canViewOrders,
            },
        ],
        [
            canViewOrders,
            canViewReservations,
            snapshot.kpis.ordersCountInRange,
            snapshot.kpis.ordersRevenueInRange,
            snapshot.kpis.reservationsCountInRange,
            snapshot.kpis.reservationsRevenueInRange,
            t,
        ],
    );

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <KpiCard key={card.title} {...card} />
                ))}
                {dualCards.map((card) => (
                    <DualStatCard key={card.title} {...card} />
                ))}
            </div>
        </div>
    );
}
