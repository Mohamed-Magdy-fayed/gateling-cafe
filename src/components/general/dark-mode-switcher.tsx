"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";
import WrapWithTooltip from "@/components/general/wrap-with-tooltip";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export function DarkModeSwitcher({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    const { t } = useTranslation({
        en: { themeToggle: "Toggle theme" },
        ar: { themeToggle: "تبديل الألوان" },
    });
    const { setTheme, theme } = useTheme();

    return (
        <WrapWithTooltip text={t("themeToggle")}>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(className)}
                {...props}
            >
                <SunIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <MoonIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <span className="sr-only">{t("themeToggle")}</span>
            </Button>
        </WrapWithTooltip>
    );
}
