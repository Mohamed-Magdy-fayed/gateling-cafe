"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import type { Reservation } from "@/drizzle/schema";
import { editReservations, getTTSUrl } from "@/features/reservations/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

function toDate(value: Reservation["endTime"]): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function useReservationAnnouncements(reservations: Reservation[]) {
    const { t, locale } = useTranslation();
    const [isPending, startTransition] = useTransition();
    const announcedIdsRef = useRef(new Set<string>());

    const announce = useCallback(
        (reservation: Reservation) => {
            if (reservation.status === "ended" || isPending) return;

            const endTime = toDate(reservation.endTime);
            if (!endTime || announcedIdsRef.current.has(reservation.id)) {
                return;
            }

            startTransition(async () => {
                const response = await editReservations({
                    ids: [reservation.id],
                    status: "ended",
                });

                if (response.error) {
                    toast.error(response.message);
                    return
                };

                const name = reservation.customerName.trim();

                const url = await getTTSUrl(name)
                const audio = new Audio(url);
                await audio.play();

                const toastTitle = t("reservationsTranslations.childPickupToastTitle", {
                    customerName: name,
                });
                const toastDescription = t(
                    "reservationsTranslations.childPickupToastDescription",
                    {
                        customerName: name,
                        endTime,
                    },
                );

                toast.info(toastTitle, { description: toastDescription });
            });
        },
        [locale, t],
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const timers = new Map<string, number>();
        const now = Date.now();

        reservations.forEach((reservation) => {
            if (
                reservation.status === "ended" ||
                reservation.status === "cancelled" ||
                announcedIdsRef.current.has(reservation.id)
            ) {
                return;
            }

            const endTime = toDate(reservation.endTime);
            if (!endTime) {
                return;
            }

            const delay = endTime.getTime() - now;
            if (delay <= 0) {
                announce(reservation);
                return;
            }

            const timerId = window.setTimeout(() => {
                announce(reservation);
                timers.delete(reservation.id);
            }, delay);

            timers.set(reservation.id, timerId);
        });

        return () => {
            timers.forEach((id) => {
                window.clearTimeout(id);
            });
        };
    }, [announce, reservations]);

    useEffect(() => {
        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);
}
