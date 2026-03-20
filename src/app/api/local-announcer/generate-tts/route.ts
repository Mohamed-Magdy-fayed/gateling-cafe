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

        return NextResponse.json({
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
    } catch (error) {
        console.error("[generate-tts] Failed:", error);
        return NextResponse.json(
            { error: "TTS generation failed" },
            { status: 500 },
        );
    }
}
