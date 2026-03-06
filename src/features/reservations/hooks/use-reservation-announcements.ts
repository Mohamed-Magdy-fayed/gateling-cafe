"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Reservation } from "@/drizzle/schema";
import {
    endReservationIfTimedOutAction,
    getAnnouncementTTSAudio,
    getAnnouncementTTSKeys,
} from "@/features/reservations/actions";
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
        const onError = () =>
            reject(new Error("Failed to play announcement audio"));

        audio.addEventListener("ended", onEnded, { once: true });
        audio.addEventListener("error", onError, { once: true });

        audio.play().catch(reject);
    });
}

function base64ToBlobUrl(base64: string, contentType = "audio/mpeg") {
    const payload = base64.includes(",")
        ? base64.substring(base64.indexOf(",") + 1)
        : base64;
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: contentType });
    return URL.createObjectURL(blob);
}

async function playBase64Audio(
    base64: string,
    ensureAudio: () => Promise<boolean>,
    contentType = "audio/mpeg",
) {
    const url = base64ToBlobUrl(base64, contentType);
    try {
        await playAudio(url, ensureAudio);
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function tryPlayViaLocalAnnouncerTTS(input: {
    clips: Array<{ key: string; base64?: string; contentType?: string }>;
}) {
    const announcerUrl =
        process.env.NEXT_PUBLIC_LOCAL_ANNOUNCER_URL?.trim() ||
        "http://127.0.0.1:17777";

    try {
        const response = await fetch(`${announcerUrl}/announce-tts`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clips: input.clips,
                duck: true,
            }),
        });

        if (!response.ok) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
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
                const response = await endReservationIfTimedOutAction({
                    id: reservation.id,
                });
                if (response.error) {
                    if (response.message !== "Not timed out") {
                        toast.error(response.message);
                    }
                    return;
                }

                const endedNow = response.data?.endedNow ?? false;

                if (mode === "announce" && endedNow) {
                    const name = reservation.customerName.trim();

                    // 1) Try local-disk cached playback (no internet/TTS needed)
                    const keys = await getAnnouncementTTSKeys(name);
                    const playedFromDisk = await tryPlayViaLocalAnnouncerTTS({
                        clips: [{ key: keys.enKey }, { key: keys.arKey }],
                    });

                    if (!playedFromDisk) {
                        // 2) Cache miss: synthesize audio (no cloud storage) then send to local announcer
                        const audio = await getAnnouncementTTSAudio(name);
                        const playedLocally = await tryPlayViaLocalAnnouncerTTS({
                            clips: [
                                {
                                    key: audio.en.key,
                                    base64: audio.en.base64,
                                    contentType: audio.en.contentType,
                                },
                                {
                                    key: audio.ar.key,
                                    base64: audio.ar.base64,
                                    contentType: audio.ar.contentType,
                                },
                            ],
                        });

                        if (!playedLocally) {
                            // 3) Fallback: in-browser playback
                            await playBase64Audio(
                                audio.en.base64,
                                ensureAudio,
                                audio.en.contentType,
                            );
                            await playBase64Audio(
                                audio.ar.base64,
                                ensureAudio,
                                audio.ar.contentType,
                            );
                        }
                    }

                    toast.info(
                        t("reservationsTranslations.childPickupToastTitle", {
                            customerName: name,
                        }),
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
                if (
                    reservation.status === "ended" ||
                    reservation.status === "cancelled"
                )
                    return false;

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
                return overdue > STALE_ANNOUNCEMENT_THRESHOLD_MS
                    ? "silent"
                    : "announce";
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
