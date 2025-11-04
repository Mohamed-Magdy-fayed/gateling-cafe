"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/general/select-field";
import {
    handleTimeChange,
    SelectTimeField,
} from "@/components/general/select-time-field";
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
} from "@/features/reservations/actions";
import {
    type ReservationFormValues,
    reservationFormSchema,
} from "@/features/reservations/schemas";
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

    const form = useForm<ReservationFormValues>({
        resolver: zodResolver(reservationFormSchema),
        defaultValues: {
            customerName: reservation?.customerName ?? "",
            customerPhone: reservation?.customerPhone ?? "",
            startTime: reservation?.startTime,
            endTime: reservation?.endTime,
            totalPrice: reservation?.totalPrice,
            totalPaid: reservation?.totalPaid ?? undefined,
            status: reservation?.status ?? "reserved",
            notes: reservation?.notes ?? "",
        },
    });

    async function handleSubmit(data: ReservationFormValues) {
        let resultReservation: ServerActionResponse<Reservation>;

        if (!reservation) {
            resultReservation = await createReservation(data);
        } else {
            resultReservation = await editReservations({
                ids: [reservation?.id],
                ...data,
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
            const reservationCode = await generateReservationCodeAction();
            form.setValue("reservationCode", reservationCode);
        });
    }, []);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <SheetFooter>
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
                        name="totalPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t("reservationsTranslations.totalPrice")}
                                </FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t(
                                            "reservationsTranslations.totalPricePlaceholder",
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
                        name={"status"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("reservationsTranslations.status")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={reservationStatus.map((status) => ({
                                            value: status,
                                            label: t(`reservationsTranslations.statusNames`, {
                                                statusName: status,
                                            }),
                                        }))}
                                        title={t("reservationsTranslations.statuses")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? null : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <SelectTimeField
                                        value={field.value ?? undefined}
                                        setValue={(val) => handleTimeChange(field, val)}
                                        title={t("reservationsTranslations.startTime")}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <SelectTimeField
                                        value={field.value ?? undefined}
                                        setValue={(val) => handleTimeChange(field, val)}
                                        title={t("reservationsTranslations.endTime")}
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
                        <Button type="button" variant="destructive">
                            {t("common.cancel")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
