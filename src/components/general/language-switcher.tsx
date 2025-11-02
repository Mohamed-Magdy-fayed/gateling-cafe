"use client";

import { GlobeIcon } from "lucide-react";
import type { ComponentProps } from "react";
import WrapWithTooltip from "@/components/general/wrap-with-tooltip";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    const { t, setLocale, locale } = useTranslation({
        en: { opposite: "عربي" },
        ar: { opposite: "English" },
    });

    return (
        <WrapWithTooltip text={t("opposite")}>
            <Button
                variant="ghost"
                size="sm"
                className={cn(className)}
                onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                {...props}
            >
                <GlobeIcon size={20} />
                <span className="sr-only">{t("opposite")}</span>
            </Button>
        </WrapWithTooltip>
    );
}
