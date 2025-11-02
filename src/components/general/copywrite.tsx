"use client";

import { P } from "@/components/ui/typography";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function FooterCopywrite() {
    const { t } = useTranslation();

    return (
        <div className="py-6 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <P className="text-sm text-muted-foreground mt-0">
                    {t("copyright", { year: new Date(), appName: t("appName") })}
                </P>
            </div>
        </div>
    );
}