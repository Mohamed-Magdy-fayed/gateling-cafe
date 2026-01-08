"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Reservation } from "@/drizzle/schema";
import { endReservationIfTimedOutAction, getTTSUrl } from "@/features/reservations/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Auto-end and optionally announce overdue reservations.
const STALE_ANNOUNCEMENT_THRESHOLD_MS = 10 * 60_000;

function toDate(value: Reservation["endTime"]): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

// Ask the browser for audio permission/unlock so playback works even when the tab refocuses later.
function useAudioUnlock() {
    const unlockedRef = useRef(false);
    const [asked, setAsked] = useState(false);

    const ensureUnlocked = useCallback(async () => {
        if (typeof window === "undefined") return false;
        if (unlockedRef.current) return true;

        // Try to resume an AudioContext (works on most browsers after a user gesture).
        try {
            // @ts-expect-error - AudioContext is global in browsers
            const ctx = new AudioContext();
            if (ctx.state === "suspended") {
                await ctx.resume();
            }
            unlockedRef.current = ctx.state === "running";
            setAsked(true);
            return unlockedRef.current;
        } catch (error) {
            console.warn("Audio unlock failed", error);
            setAsked(true);
            return false;
        }
    }, []);

    // If not unlocked, prompt the user once via toast to click anywhere to allow audio.
    useEffect(() => {
        if (asked || unlockedRef.current) return;
        const handler = () => {
            void ensureUnlocked();
            window.removeEventListener("pointerdown", handler);
        };
        window.addEventListener("pointerdown", handler, { once: true });
        return () => window.removeEventListener("pointerdown", handler);
    }, [asked, ensureUnlocked]);

    return ensureUnlocked;
}

async function playAudio(url: string, ensureAudio: () => Promise<boolean>) {
    const canPlay = await ensureAudio();
    if (!canPlay) {
        toast.warning("Allow audio playback to hear announcements.");
    }

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
    const { t } = useTranslation();
    const ensureAudio = useAudioUnlock();

    const processed = useRef<Set<string>>(new Set());
    const reservationsRef = useRef(reservations);
    useEffect(() => {
        reservationsRef.current = reservations;
    }, [reservations]);

    const isRunningRef = useRef(false);

    const processReservation = useCallback(
        async (reservation: Reservation, mode: "announce" | "silent") => {
            try {
                const response = await endReservationIfTimedOutAction({ id: reservation.id });
                if (response.error) {
                    if (response.message !== "Not timed out") {
                        toast.error(response.message);
                    }
                    return;
                }

                if (mode === "announce") {
                    const name = reservation.customerName.trim();
                    const { enUrl, arUrl } = await getTTSUrl(name);
                    await playAudio(enUrl, ensureAudio);
                    await playAudio(arUrl, ensureAudio);

                    toast.info(
                        t("reservationsTranslations.childPickupToastTitle", { customerName: name }),
                        {
                            description: t(
                                "reservationsTranslations.childPickupToastDescription",
                                {
                                    customerName: name,
                                    endTime: toDate(reservation.endTime),
                                },
                            ),
                        },
                    );
                }

                processed.current.add(reservation.id);
                reservationsRef.current = reservationsRef.current.map((item) =>
                    item.id === reservation.id ? { ...item, status: "ended" } : item,
                );
            } catch (error) {
                toast.error((error as Error).message);
            }
        },
        [ensureAudio, t],
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        const run = () => {
            if (isRunningRef.current) return;
            const now = Date.now();

            const target = reservationsRef.current.find((reservation) => {
                if (processed.current.has(reservation.id)) return false;
                if (reservation.status === "ended" || reservation.status === "cancelled") return false;

                const end = toDate(reservation.endTime);
                if (!end) return false;
                return end.getTime() <= now;
            });

            if (!target) return;

            isRunningRef.current = true;

            const mode = (() => {
                const end = toDate(target.endTime);
                if (!end) return "silent" as const;
                const overdue = now - end.getTime();
                return overdue > STALE_ANNOUNCEMENT_THRESHOLD_MS ? "silent" : "announce";
            })();

            void processReservation(target, mode).finally(() => {
                isRunningRef.current = false;
            });
        };

        run();
        const interval = window.setInterval(run, 30_000);
        window.addEventListener("focus", run);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", run);
        };
    }, [processReservation]);
}
