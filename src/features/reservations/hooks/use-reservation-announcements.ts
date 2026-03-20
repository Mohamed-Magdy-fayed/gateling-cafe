"use client";

import { useEffect, useRef } from "react";
import type { Reservation } from "@/drizzle/schema";

const DEFAULT_LOCAL_ANNOUNCER_URL = "http://127.0.0.1:17777";

function toDate(value: Reservation["endTime"]): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function postJson(url: string, body: unknown) {
    return fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

export function useReservationAnnouncements(reservations: Reservation[]) {
    const scheduledById = useRef(new Map<string, string>());

    useEffect(() => {
        if (typeof window === "undefined") return;

        const announcerUrl =
            process.env.NEXT_PUBLIC_LOCAL_ANNOUNCER_URL?.trim() ||
            DEFAULT_LOCAL_ANNOUNCER_URL;

        let disposed = false;

        void (async () => {
            const active = reservations
                .map((reservation) => {
                    const end = toDate(reservation.endTime);
                    return { reservation, end };
                })
                .filter(({ reservation, end }) => {
                    if (!end) return false;
                    if (reservation.status === "ended") return false;
                    if (reservation.status === "cancelled") return false;
                    return true;
                });

            const activeIds = new Set(
                active.map(({ reservation }) => reservation.id),
            );

            // Cancel anything no longer active.
            for (const id of Array.from(scheduledById.current.keys())) {
                if (activeIds.has(id)) continue;
                scheduledById.current.delete(id);
                try {
                    await postJson(`${announcerUrl}/cancel-reservation`, {
                        reservationId: id,
                    });
                } catch {
                    // local service might be offline
                }
            }

            for (const { reservation, end } of active) {
                if (!end) continue;
                if (disposed) return;

                const endIso = end.toISOString();
                const prev = scheduledById.current.get(reservation.id);
                if (prev === endIso) continue;

                const customerName = reservation.customerName.trim();

                try {
                    // Just schedule with the local announcer.
                    // The announcer handles TTS generation and disk caching.
                    await postJson(`${announcerUrl}/schedule-reservation`, {
                        reservationId: reservation.id,
                        endTimeUtc: endIso,
                        customerName,
                        duck: true,
                    });

                    scheduledById.current.set(reservation.id, endIso);
                } catch {
                    // local service might be offline
                }
            }
        })();

        return () => {
            disposed = true;
        };
    }, [reservations]);
}
