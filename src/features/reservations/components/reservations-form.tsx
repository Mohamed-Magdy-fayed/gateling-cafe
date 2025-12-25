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
import { type Reservation, reservationStatus } from "@/drizzle/schema";
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
                totalPaid: reservation.totalPaid ?? undefined,
                notes: reservation.notes ?? "",
                playtimeOptionId: reservation.playtimeOptionId ?? "",
                reservationCode: reservation.reservationCode ?? "",
                status: reservation.status,
            }
            : {
                reservationCode: "",
                customerName: "",
                customerPhone: "",
                playtimeOptionId: "",
                totalPaid: undefined,
                notes: "",
                status: "reserved",
            },
    });

    const id = form.watch("playtimeOptionId");
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
                playtimeOptionId: data.playtimeOptionId ?? "",
                totalPaid: data.totalPaid ?? 0,
                notes: data.notes,
            };

            resultReservation = await createReservation(payload);
        } else {
            const payload: Partial<ReservationUpdateValues> = {
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                totalPaid: data.totalPaid,
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
    }, [reservation, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <SheetFooter>
                    {!reservation ? (
                        <FormField
                            control={form.control}
                            name="reservationCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t("reservationsTranslations.reservationCode")}
                                    </FormLabel>
                                    <FormControl>
                                        <Badge>{field.value ?? t("common.loading")}</Badge>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : null}
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

                    <FormItem>
                        <FormLabel>{t("reservationsTranslations.totalPrice")}</FormLabel>
                        <FormControl>
                            <Badge>
                                {selectedPlaytime
                                    ? formatCurrency(selectedPlaytime.price)
                                    : t("common.loading")}
                            </Badge>
                        </FormControl>
                    </FormItem>
                    <FormField
                        control={form.control}
                        name={"totalPaid"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("reservationsTranslations.totalPaid")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t(
                                            "reservationsTranslations.totalPaidPlaceholder",
                                        )}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("reservationsTranslations.status")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={reservationStatus.map((status) => ({
                                            value: status,
                                            label: t("reservationsTranslations.statusNames", {
                                                statusName: status,
                                            }),
                                        }))}
                                        setValues={(values) => field.onChange(values[0])}
                                        values={[field.value]}
                                        title={t("reservationsTranslations.status")}
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
