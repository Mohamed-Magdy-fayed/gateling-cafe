"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Reservation } from "@/drizzle/schema";
import { autoStartDueReservationsAction } from "@/features/reservations/actions";

export function useReservationStart(reservations: Reservation[]) {
    const reservationsRef = useRef(reservations);
    const isRunningRef = useRef(false);

    useEffect(() => {
        reservationsRef.current = reservations;
    }, [reservations]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const run = async () => {
            if (isRunningRef.current) return;

            const hasDue = reservationsRef.current.some((reservation) => {
                if (reservation.status !== "reserved") return false;
                const start = new Date(reservation.startTime);
                return !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
            });

            if (!hasDue) return;

            isRunningRef.current = true;
            try {
                const response = await autoStartDueReservationsAction();
                if (response.error) {
                    toast.error(response.message ?? "Unable to start reservations.");
                }
            } catch (error) {
                toast.error((error as Error).message ?? "Unable to start reservations.");
            } finally {
                isRunningRef.current = false;
            }
        };

        run();
        const interval = window.setInterval(run, 30_000);
        window.addEventListener("focus", run);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", run);
        };
    }, []);
}
