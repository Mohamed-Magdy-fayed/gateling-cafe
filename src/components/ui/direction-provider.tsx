"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { Provider } from "@radix-ui/react-direction"

export function DirectionProvider({ children }: { children: React.ReactNode }) {
    const { dir } = useTranslation();
    return (
        <Provider dir={dir} children={children} />
    );
}
