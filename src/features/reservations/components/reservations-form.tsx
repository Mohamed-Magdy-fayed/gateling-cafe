"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/general/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { SheetFooter } from "@/components/ui/sheet";
import type { Reservation } from "@/drizzle/schema";
import {
    createReservation,
    editReservations,
    generateReservationCodeAction,
    getPlaytimeOptions,
} from "@/features/reservations/actions";
import {
    type ReservationCreateValues,
    type ReservationFormValues,
    type ReservationUpdateValues,
    reservationFormSchema,
} from "@/features/reservations/schemas";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { ServerActionResponse } from "@/types/server-actions";

export function ReservationsForm({
    reservation,
    setIsOpen,
}: {
    reservation?: Reservation;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const [playtimeOptions, setPlaytimeOptions] = useState<
        { value: string; label: string; price: number }[]
    >([]);

    const form = useForm<ReservationFormValues>({
        resolver: zodResolver<
            ReservationFormValues,
            unknown,
            ReservationFormValues
        >(reservationFormSchema),
        defaultValues: reservation
            ? {
                customerName: reservation.customerName ?? "",
                customerPhone: reservation.customerPhone ?? "",
                notes: reservation.notes ?? "",
                playtimeOptionId: reservation.playtimeOptionId ?? "",
                reservationCode: reservation.reservationCode ?? "",
            }
            : {
                reservationCode: "",
                customerName: "",
                customerPhone: "",
                persons: 1,
                playtimeOptionId: "",
                notes: "",
            },
    });

    const id = form.watch("playtimeOptionId");
    const reservationCode = form.watch("reservationCode");
    const selectedPlaytime = useMemo(() => {
        return playtimeOptions.find((o) => o.value === id) ?? null;
    }, [playtimeOptions, form, id]);

    async function handleSubmit(data: ReservationFormValues) {
        let resultReservation: ServerActionResponse<Reservation>;

        if (!reservation) {
            const payload: ReservationCreateValues = {
                reservationCode: data.reservationCode ?? "",
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                persons: data.persons,
                playtimeOptionId: data.playtimeOptionId ?? "",
                notes: data.notes,
            };

            resultReservation = await createReservation(payload);
        } else {
            const payload: Partial<ReservationUpdateValues> = {
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                notes: data.notes,
            };

            resultReservation = await editReservations({
                ids: [reservation.id],
                ...payload,
            });
        }

        if (resultReservation.error) {
            toast.error(t("error", { error: resultReservation.message }));
        } else {
            // Schedule with local announcer (client-side, since it runs on the same LAN).
            if (!reservation && resultReservation.data) {
                const r = resultReservation.data;
                const announcerUrl =
                    process.env.NEXT_PUBLIC_LOCAL_ANNOUNCER_URL?.trim() ||
                    "http://127.0.0.1:17777";
                fetch(`${announcerUrl}/schedule-reservation`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        reservationId: r.id,
                        endTimeUtc: new Date(r.endTime).toISOString(),
                        customerName: r.customerName.trim(),
                        duck: true,
                    }),
                }).catch((e) => {
                    // Local service might be offline — non-fatal.
                    console.warn(`[Announcer] Failed to schedule reservation ${r.id}:`, e);
                });
            }
            toast.success(t("success"));
            setIsOpen(false);
        }
    }

    useEffect(() => {
        startTransition(async () => {
            const res = await getPlaytimeOptions();
            if (!res.error) {
                setPlaytimeOptions(
                    res.data.map((o) => ({
                        value: o.id,
                        label: `${o.name} (${o.durationMinutes} min) - ${o.price}`,
                        price: o.price,
                    })),
                );
            }
        });
    }, []);

    useEffect(() => {
        if (reservation) return;

        startTransition(async () => {
            const reservationCode = await generateReservationCodeAction();
            form.setValue("reservationCode", reservationCode);
        });
    }, [reservation]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <SheetFooter>
                    <div className="flex items-center gap-2 justify-between">
                        <FormItem>
                            <FormLabel>
                                {t("reservationsTranslations.reservationCode")}
                            </FormLabel>
                            <FormControl>
                                <Badge>{reservationCode ?? t("common.loading")}</Badge>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        <FormItem>
                            <FormLabel>{t("reservationsTranslations.totalPrice")}</FormLabel>
                            <FormControl>
                                <Badge>
                                    {selectedPlaytime
                                        ? formatCurrency(selectedPlaytime.price)
                                        : isPending
                                            ? t("common.loading")
                                            : t("reservationsTranslations.selectPlaytimeOption")}
                                </Badge>
                            </FormControl>
                        </FormItem>
                    </div>
                    <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t("reservationsTranslations.customerName")}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("reservationsTranslations.customerName")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t("reservationsTranslations.customerPhone")}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("reservationsTranslations.customerPhone")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="persons"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("reservationsTranslations.persons")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t("reservationsTranslations.persons")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="playtimeOptionId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t("reservationsTranslations.playtimeOption")}
                                </FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={playtimeOptions.map((o) => ({
                                            value: o.value,
                                            label: o.label,
                                        }))}
                                        title={t("reservationsTranslations.playtimeOptions")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? "" : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex items-center justify-between gap-4">
                        <Button
                            disabled={form.formState.isSubmitting || isPending}
                            className="flex-1"
                        >
                            <SaveIcon />
                            {t("common.save")}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setIsOpen(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
