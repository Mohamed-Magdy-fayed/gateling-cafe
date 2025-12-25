"use client";

import { addDays } from "date-fns";
import { CalendarIcon, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";

function parseMs(value: string | null) {
    if (!value) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function formatRangeText(range: DateRange) {
    if (!range.from && !range.to) return "";
    if (range.from && range.to) {
        return `${formatDate(range.from, { month: "short" })} - ${formatDate(range.to, {
            month: "short",
        })}`;
    }
    return formatDate(range.from ?? range.to, { month: "short" });
}

export function DashboardDateRangeFilter({
    prefix,
    title,
    defaultRange,
}: {
    prefix: string;
    title: string;
    defaultRange: { from: Date; to: Date };
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const fromKey = `${prefix}From`;
    const toKey = `${prefix}To`;

    const selected = React.useMemo<DateRange>(() => {
        const fromMs = parseMs(searchParams.get(fromKey));
        const toMs = parseMs(searchParams.get(toKey));

        const from = fromMs ? new Date(fromMs) : defaultRange.from;
        const to = toMs ? new Date(toMs) : defaultRange.to;

        const a = from.getTime();
        const b = to.getTime();
        return a <= b ? { from, to } : { from: to, to: from };
    }, [defaultRange.from, defaultRange.to, fromKey, toKey, searchParams]);

    const hasExplicitValue = React.useMemo(() => {
        return searchParams.has(fromKey) || searchParams.has(toKey);
    }, [fromKey, toKey, searchParams]);

    const pushRange = React.useCallback(
        (range: DateRange | undefined) => {
            const next = new URLSearchParams(searchParams.toString());

            if (!range?.from && !range?.to) {
                next.delete(fromKey);
                next.delete(toKey);
                router.replace(`${pathname}?${next.toString()}`, { scroll: false });
                return;
            }

            const from = range.from ?? range.to;
            const to = range.to ?? range.from;

            if (from) next.set(fromKey, String(from.getTime()));
            if (to) next.set(toKey, String(to.getTime()));

            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        },
        [fromKey, toKey, pathname, router, searchParams],
    );

    const onReset = React.useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            pushRange(undefined);
        },
        [pushRange],
    );

    const label = React.useMemo(() => {
        const dateText = formatRangeText(selected);
        return (
            <span className="flex items-center gap-2">
                <span>{title}</span>
                {dateText ? (
                    <>
                        <Separator
                            orientation="vertical"
                            className="mx-0.5 data-[orientation=vertical]:h-4"
                        />
                        <span className="text-muted-foreground">{dateText}</span>
                    </>
                ) : null}
            </span>
        );
    }, [selected, title]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-dashed"
                    aria-label={t("dataTable.clearFilter", { title })}
                    tabIndex={0}
                >
                    {hasExplicitValue ? (
                        <div
                            onClick={onReset}
                            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <XCircle />
                        </div>
                    ) : (
                        <CalendarIcon />
                    )}
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-min p-0" align="start">
                <Calendar
                    captionLayout="dropdown"
                    mode="range"
                    selected={selected}
                    onSelect={(r) => pushRange(r)}
                />
                <div className="flex flex-wrap gap-2 border-t px-4 py-4!">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                            const d = new Date();
                            pushRange({ from: d, to: d });
                        }}
                    >
                        {t("common.today")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                            const d = addDays(new Date(), -1);
                            pushRange({ from: d, to: d });
                        }}
                    >
                        {t("common.yesterday")}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
