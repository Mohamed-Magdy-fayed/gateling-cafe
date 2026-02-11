"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const HARDCODED_PRINTER_NAME = "OneNote (Desktop)"; // change this later if needed

export default function ClientQzTest() {
    const [status, setStatus] = useState<
        "idle" | "importing" | "connecting" | "connected" | "error"
    >("idle");
    const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
    const [simulatePrint, setSimulatePrint] = useState<boolean>(false);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setStatus("importing");
                const mod = await import("qz-tray");
                const qz = (mod as any).default ?? mod;

                setStatus("connecting");
                await qz.websocket.connect();

                if (!mounted) return;
                setStatus("connected");

                // Attempt to retrieve printers via several possible APIs
                let printers: string[] = [];

                try {
                    if (typeof qz.getPrinters === "function") {
                        printers = await qz.getPrinters();
                    } else if (qz.printers && typeof qz.printers.find === "function") {
                        // qz.printers.find may accept a pattern; attempt to find a default
                        try {
                            const found = await qz.printers.find("*");
                            if (found) printers = [found];
                        } catch (e) {
                            // fallback: try empty find
                            const found2 = await qz.printers.find("");
                            if (found2) printers = [found2];
                        }
                    } else if (qz.api && typeof qz.api.getPrinters === "function") {
                        printers = await qz.api.getPrinters();
                    }
                } catch (e) {
                    // suppress non-error logging
                }

                if (!mounted) return;

                setDetectedPrinters(printers);

                // Choose a first non-virtual printer (avoid OneNote/PDF drivers). If none found, we'll simulate.
                const virtualPattern = /OneNote|PDF|Fax|Microsoft Print to PDF|Send To OneNote/i;
                const nonVirtual = printers.find((p) => !virtualPattern.test(p));

                if (nonVirtual) {
                    setSelectedPrinter(nonVirtual);
                    setSimulatePrint(false);
                } else if (printers.length > 0) {
                    // No obvious physical printer found; pick first but mark simulate
                    setSelectedPrinter(printers[0]);
                    setSimulatePrint(true);
                } else {
                    // No printers detected at all
                    setSelectedPrinter(HARDCODED_PRINTER_NAME);
                    setSimulatePrint(true);
                }
            } catch (err) {
                if (mounted) setStatus("error");
                console.error("QZ Tray: connection failed", err);
            }
        })();

        return () => {
            mounted = false;
            try {
                const qzGlobal = (globalThis as any).qz;
                if (qzGlobal && qzGlobal.websocket && qzGlobal.websocket.disconnect) {
                    qzGlobal.websocket.disconnect();
                }
            } catch (e) {
                // ignore
            }
        };
    }, []);

    // no-op: do not log sample receipt

    return (
        <div className="space-y-2">
            <div>
                QZ Tray test status: <strong>{status}</strong>
            </div>
            <div>
                Detected printers:{" "}
                <strong>{detectedPrinters.join(", ") || "(none)"}</strong>
            </div>
            <div>
                Selected (hardcoded) printer:{" "}
                <strong>{selectedPrinter ?? "(none)"}</strong>
            </div>
            <div>
                Check browser console for connection and listing logs (no printing
                performed).
            </div>
            {/* Test Print button removed — printing now hooks into real order creation. */}
        </div>
    );
}
