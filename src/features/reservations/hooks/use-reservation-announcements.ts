"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import type { Reservation } from "@/drizzle/schema";
import { endReservationIfTimedOutAction, getTTSUrl } from "@/features/reservations/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

function toDate(value: Reservation["endTime"]): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function playAudio(url: string) {
    const audio = new Audio(url);

    return new Promise<void>((resolve, reject) => {
        const onEnded = () => resolve();
        const onError = () => reject(new Error("Failed to play announcement audio"));

        audio.addEventListener("ended", onEnded, { once: true });
        audio.addEventListener("error", onError, { once: true });

        audio.play().catch(reject);
    });
}

export function useReservationAnnouncements(reservations: Reservation[]) {
    const { t, locale } = useTranslation();
    const [_, startTransition] = useTransition();
    const announcedIdsRef = useRef(new Set<string>());
    const isAnnouncingRef = useRef(false);

    const reservationsRef = useRef(reservations);
    useEffect(() => {
        reservationsRef.current = reservations;
    }, [reservations]);

    const announce = useCallback(
        (reservation: Reservation) => {
            if (
                reservation.status === "ended" ||
                reservation.status === "cancelled" ||
                isAnnouncingRef.current
            ) {
                return;
            }

            const endTime = toDate(reservation.endTime);
            if (!endTime || announcedIdsRef.current.has(reservation.id)) {
                return;
            }

            // Mark as in-progress to prevent duplicate triggers until this completes.
            announcedIdsRef.current.add(reservation.id);
            isAnnouncingRef.current = true;

            startTransition(async () => {
                try {
                    const response = await endReservationIfTimedOutAction({
                        id: reservation.id,
                    });

                    if (response.error) {
                        if (response.message !== "Not timed out") {
                            toast.error(response.message);
                        }
                        announcedIdsRef.current.delete(reservation.id);
                        return;
                    }

                    const name = reservation.customerName.trim();

                    const { enUrl, arUrl } = await getTTSUrl(name);
                    await playAudio(enUrl);
                    await playAudio(arUrl);

                    const toastTitle = t(
                        "reservationsTranslations.childPickupToastTitle",
                        {
                            customerName: name,
                        },
                    );
                    const toastDescription = t(
                        "reservationsTranslations.childPickupToastDescription",
                        {
                            customerName: name,
                            endTime,
                        },
                    );

                    toast.info(toastTitle, { description: toastDescription });
                } catch (error) {
                    announcedIdsRef.current.delete(reservation.id);
                    toast.error((error as Error).message);
                } finally {
                    isAnnouncingRef.current = false;
                }
            });
        },
        [locale, startTransition, t],
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const check = () => {
            const now = Date.now();
            for (const reservation of reservationsRef.current) {
                if (
                    reservation.status === "ended" ||
                    reservation.status === "cancelled" ||
                    announcedIdsRef.current.has(reservation.id)
                ) {
                    continue;
                }

                const endTime = toDate(reservation.endTime);
                if (!endTime) continue;

                if (endTime.getTime() <= now) {
                    announce(reservation);
                    // Only attempt one per tick to keep audio/tts serial.
                    break;
                }
            }
        };

        check();

        const interval = window.setInterval(check, 30_000);
        const onVisibility = () => {
            if (document.visibilityState === "visible") check();
        };

        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", check);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [announce]);

    useEffect(() => {
        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);
}
