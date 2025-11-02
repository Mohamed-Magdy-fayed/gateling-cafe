"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

type TProps = {
    k: Parameters<ReturnType<typeof useTranslation>["t"]>[0];
    args?: Parameters<ReturnType<typeof useTranslation>["t"]>[1];
};

/**
 * A Client Component that renders a translated string using the client-side
 * i18n context. Use this inside Server Components to ensure text updates
 * instantly on language change.
 */
export function ServerTranslate({ k, args }: TProps) {
    const { t } = useTranslation();

    // The `as any` is a practical concession here because TypeScript has trouble
    // correlating the generic `k` and `args` props. We know from our TProps
    // definition that they are a valid pair.
    return <>{t(k, { ...args })}</>;
}
