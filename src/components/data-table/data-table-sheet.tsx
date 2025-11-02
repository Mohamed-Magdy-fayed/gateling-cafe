"use client";

import type { ComponentProps, ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function DataTableSheet({
    isUpdate = false,
    trigger,
    content,
    ...props
}: ComponentProps<typeof Sheet> & {
    isUpdate?: boolean;
    trigger?: ReactNode;
    content?: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <Sheet {...props}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {isUpdate ? t("common.edit") : t("common.add")}
                    </SheetTitle>
                </SheetHeader>
                {content}
            </SheetContent>
        </Sheet>
    );
}
