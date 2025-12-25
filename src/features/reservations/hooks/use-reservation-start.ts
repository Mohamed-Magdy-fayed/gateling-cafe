"use client";

import { useEffect, useRef, useTransition } from "react";
import type { Reservation } from "@/drizzle/schema";
import { autoStartDueReservationsAction } from "@/features/reservations/actions";

export function useReservationStart(reservations: Reservation[]) {
    const [_, startTransition] = useTransition();

    const reservationsRef = useRef(reservations);
    useEffect(() => {
        reservationsRef.current = reservations;
    }, [reservations]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const sync = () => {
            startTransition(async () => {
                await autoStartDueReservationsAction();
            });
        };

        sync();

        const interval = window.setInterval(sync, 30_000);
        const onVisibility = () => {
            if (document.visibilityState === "visible") sync();
        };

        window.addEventListener("focus", sync);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", sync);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [startTransition]);
}
