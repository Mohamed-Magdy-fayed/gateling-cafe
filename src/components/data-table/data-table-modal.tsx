"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ComponentProps, ReactNode } from "react";

export function DataTableModal({
    isUpdate = false,
    trigger,
    content,
    ...props
}: ComponentProps<typeof Dialog> & {
    isUpdate?: boolean;
    trigger?: ReactNode;
    content?: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <Dialog {...props}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isUpdate ? t("common.edit") : t("common.add")}</DialogTitle>
                </DialogHeader>
                <div className="pt-6">{content}</div>
            </DialogContent>
        </Dialog>
    )
}