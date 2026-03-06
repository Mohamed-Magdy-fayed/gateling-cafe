import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { db } from "@/drizzle";
import { ReservationsTable } from "@/drizzle/schema";

type Payload = {
    id?: string;
};

export async function POST(request: Request) {
    const expectedToken = process.env.LOCAL_ANNOUNCER_END_TOKEN;
    if (!expectedToken) {
        return NextResponse.json(
            { error: "LOCAL_ANNOUNCER_END_TOKEN is not configured" },
            { status: 500 },
        );
    }

    const auth = request.headers.get("authorization") ?? "";
    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || token !== expectedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Payload;
    try {
        body = (await request.json()) as Payload;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const reservationId = (body.id ?? "").trim();
    if (!reservationId) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const now = new Date();

    const reservation = await db
        .select({
            id: ReservationsTable.id,
            status: ReservationsTable.status,
            endTime: ReservationsTable.endTime,
        })
        .from(ReservationsTable)
        .where(
            and(
                eq(ReservationsTable.id, reservationId),
                isNull(ReservationsTable.deletedAt),
            ),
        )
        .limit(1)
        .then((res) => res[0]);

    if (!reservation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reservation.status === "ended" || reservation.status === "cancelled") {
        return NextResponse.json({ ok: true, endedNow: false });
    }

    const endTime = new Date(reservation.endTime);
    if (Number.isNaN(endTime.getTime()) || endTime.getTime() > now.getTime()) {
        return NextResponse.json({ ok: true, endedNow: false });
    }

    const ended = await db
        .update(ReservationsTable)
        .set({
            status: "ended",
            updatedAt: new Date(),
            updatedBy: "local-announcer",
        })
        .where(eq(ReservationsTable.id, reservationId))
        .returning({ id: ReservationsTable.id });

    const endedNow = ended.length > 0;

    revalidatePath("/reservations");

    return NextResponse.json({ ok: true, endedNow });
}
