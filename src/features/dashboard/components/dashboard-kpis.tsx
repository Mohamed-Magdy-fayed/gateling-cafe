"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

function DayClosingCard({
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

    const defaultActual = snapshot.dayClosure?.actualCashCents
        ?? snapshot.dayClosure?.expectedTotalCents
        ?? null;
    const [actualCash, setActualCash] = useState<number | null>(defaultActual);
    const [notes, setNotes] = useState(snapshot.dayClosure?.notes ?? "");

    const expectedTotal = snapshot.dayClosure?.expectedTotalCents ?? 0;
    const closure = snapshot.dayClosure;

    const variance = closure && closure.differenceCents != null
        ? closure.differenceCents
        : 0;

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
                        {t("dashboardTranslations.cashVariance")}: {closure
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
                                ? t("dashboardTranslations.actualCashCollected") + ": " + formatCurrency(closure.actualCashCents ?? 0)
                                : t("dashboardTranslations.dayOpenPendingClose")}
                        </div>
                        {closure.closedAt && (
                            <div>
                                {t("dashboardTranslations.closedBy", { by: closure.closedBy ?? "" })}
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

            <CardFooter className="flex items-center justify-end gap-2">
                {!closure && (
                    <Button disabled={!canCloseDay || isSubmitting} onClick={handleOpenDay}>
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
                                <DialogTitle>{t("dashboardTranslations.closeDayTitle")}</DialogTitle>
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
                                        placeholder={t("dashboardTranslations.actualCashPlaceholder")}
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
                                        placeholder={t("dashboardTranslations.closeDayNotePlaceholder")}
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

function ShiftHistoryCard({ history }: { history: DashboardSnapshot["shiftHistory"] }) {
    const { t } = useTranslation();

    const formatDateTime = (value: string) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(value));
        } catch (_error) {
            return value;
        }
    };

    const getVarianceMeta = (difference: number | null) => {
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
    };

    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                    {t("dashboardTranslations.shiftHistoryTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {history.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        {t("dashboardTranslations.shiftHistoryEmpty")}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => {
                            const varianceMeta = getVarianceMeta(item.differenceCents ?? 0);

                            return (
                                <div
                                    key={item.id}
                                    className="rounded-md border border-border/60 bg-muted/10 p-3"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm font-medium text-foreground">
                                            {formatDateTime(item.closedAt)}
                                        </div>
                                        <Badge variant="outline" className={varianceMeta.className}>
                                            {varianceMeta.label}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                        <div>
                                            {t("dashboardTranslations.shiftHistoryOpened", {
                                                when: formatDateTime(item.openedAt),
                                                by: item.openedBy,
                                            })}
                                        </div>
                                        <div>
                                            {t("dashboardTranslations.shiftHistoryClosed", {
                                                when: formatDateTime(item.closedAt),
                                                by: item.closedBy ?? t("dashboardTranslations.none"),
                                            })}
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("dashboardTranslations.shiftHistoryExpected")}
                                            </div>
                                            <div className="font-medium text-foreground">
                                                {item.expectedTotalCents != null
                                                    ? formatCurrency(item.expectedTotalCents)
                                                    : "--"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("dashboardTranslations.shiftHistoryActual")}
                                            </div>
                                            <div className="font-medium text-foreground">
                                                {item.actualCashCents != null
                                                    ? formatCurrency(item.actualCashCents)
                                                    : "--"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("dashboardTranslations.shiftHistoryVariance")}
                                            </div>
                                            <div className="font-medium text-foreground">
                                                {item.differenceCents != null
                                                    ? formatCurrency(Math.abs(item.differenceCents))
                                                    : "--"}
                                            </div>
                                        </div>
                                    </div>
                                    {item.notes ? (
                                        <div className="mt-3 text-xs text-muted-foreground">
                                            {item.notes}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function DashboardKpis({
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

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title={t("dashboardTranslations.reservationsIncomeToday")}
                    value={formatCurrency(snapshot.kpis.reservationsRevenueToday)}
                    subtext={t("dashboardTranslations.playground")}
                />
                <KpiCard
                    title={t("dashboardTranslations.ordersIncomeToday")}
                    value={formatCurrency(snapshot.kpis.ordersRevenueToday)}
                    subtext={t("dashboardTranslations.cafe")}
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

            <DayClosingCard snapshot={snapshot} canCloseDay={canCloseDay} />
        </div>
    );
}
