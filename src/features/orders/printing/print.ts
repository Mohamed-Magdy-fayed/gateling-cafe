import type { RefObject } from "react";
import type { Order } from "@/drizzle/schema";
import { formatReceiptPlain } from "@/features/orders/printing/receipt";

interface PrintArgs {
    qz: any;
    order: Order;
    printerName: string;
    appName: string;
}

export async function printWithQz({ qz, order, printerName, appName }: PrintArgs) {
    const receipt = formatReceiptPlain(order, appName);
    const payload = [
        {
            type: "html",
            format: "plain",
            data: `<pre style="font-family: monospace; white-space: pre; margin: 0;">${receipt}</pre>`,
        },
    ];

    let config = null;
    if (qz.configs && typeof qz.configs.create === "function") {
        config = qz.configs.create(printerName);
    } else {
        config = { printer: printerName };
    }

    if (typeof qz.print === "function") {
        await qz.print(config, payload);
    } else if (qz.api && typeof qz.api.print === "function") {
        await qz.api.print(config, payload);
    } else {
        console.error("Auto-print: no print API available on qz-tray module");
    }
}

export async function ensureQzSecurity(
    qz: any,
    initializedRef: RefObject<boolean>,
) {
    if (initializedRef.current) return;

    const cert = process.env.NEXT_PUBLIC_QZ_CERT;
    const privateKeyPem = process.env.NEXT_PUBLIC_QZ_PRIVATE_KEY;

    if (
        cert &&
        qz.security &&
        typeof qz.security.setCertificatePromise === "function"
    ) {
        qz.security.setCertificatePromise(() => Promise.resolve(cert.trim()));
    }

    if (
        privateKeyPem &&
        typeof window !== "undefined" &&
        window.crypto?.subtle &&
        qz.security &&
        typeof qz.security.setSignaturePromise === "function"
    ) {
        qz.security.setSignaturePromise(async (toSign: string) => {
            const keyBuffer = pemToArrayBuffer(privateKeyPem);
            const key = await window.crypto.subtle.importKey(
                "pkcs8",
                keyBuffer,
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: "SHA-256",
                },
                false,
                ["sign"],
            );

            const data = new TextEncoder().encode(toSign);
            const signature = await window.crypto.subtle.sign(
                "RSASSA-PKCS1-v1_5",
                key,
                data,
            );

            return arrayBufferToBase64(signature);
        });
    }

    initializedRef.current = true;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const cleaned = pem
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "");
    const binary = window.atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
