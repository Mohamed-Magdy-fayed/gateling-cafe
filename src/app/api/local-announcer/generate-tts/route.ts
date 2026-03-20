import { NextResponse } from "next/server";
import { getAnnouncementTTSAudio } from "@/features/reservations/actions";

type Payload = {
    customerName?: string;
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

    const customerName = (body.customerName ?? "").trim();
    if (!customerName) {
        return NextResponse.json(
            { error: "customerName is required" },
            { status: 400 },
        );
    }

    try {
        const audio = await getAnnouncementTTSAudio(customerName);

        // Only include clips that have base64 (cache misses that need downloading).
        // If base64 is null, the DB says it was generated before — announcer should have the file.
        const clips = [audio.en, audio.ar]
            .filter((c) => c.base64 !== null)
            .map((c) => ({
                key: c.key,
                base64: c.base64,
                contentType: c.contentType,
            }));

        return NextResponse.json({ clips });
    } catch (error) {
        console.error("[generate-tts] Failed:", error);
        return NextResponse.json(
            { error: "TTS generation failed" },
            { status: 500 },
        );
    }
}
