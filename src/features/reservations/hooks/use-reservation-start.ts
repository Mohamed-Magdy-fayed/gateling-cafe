"use client";

import { useEffect, useTransition } from "react";
import type { Reservation } from "@/drizzle/schema";
import { editReservations } from "@/features/reservations/actions";

export function useReservationStart(reservations: Reservation[]) {
    const [_, startTransition] = useTransition();

    useEffect(() => {
        const interval = setInterval(() => {
            startTransition(async () => {
                const shouldStart = reservations.filter(reservation => reservation.status === "reserved" && reservation.startTime < new Date())

                await editReservations({
                    ids: shouldStart.map(r => r.id),
                    status: "started",
                })
            })
        }, 60000);

        return () => clearInterval(interval);
    }, []);
}
