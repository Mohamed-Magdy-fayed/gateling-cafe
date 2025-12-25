"use client";

import { Settings2Icon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
    getAnnouncementTTSTemplates,
    updateAnnouncementTTSTemplates,
} from "@/features/reservations/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function AnnouncementTTSSettingsSheet() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [templateEn, setTemplateEn] = useState("");
    const [templateAr, setTemplateAr] = useState("");

    useEffect(() => {
        if (!open) return;

        startTransition(async () => {
            const res = await getAnnouncementTTSTemplates();
            if (res.error) {
                toast.error(res.message);
                return;
            }

            setTemplateEn(res.data.templateEn);
            setTemplateAr(res.data.templateAr);
        });
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                    <Settings2Icon className="size-4" />
                    {t("reservationsTranslations.ttsAnnouncementSettings.title")}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {t("reservationsTranslations.ttsAnnouncementSettings.title")}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-4 p-4">
                    <div className="space-y-2">
                        <Label>
                            {t(
                                "reservationsTranslations.ttsAnnouncementSettings.englishTemplate",
                            )}
                        </Label>
                        <Textarea
                            value={templateEn}
                            onChange={(e) => setTemplateEn(e.target.value)}
                            placeholder={t(
                                "reservationsTranslations.ttsAnnouncementSettings.templatePlaceholder",
                                { name: "{name}" },
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {t(
                                "reservationsTranslations.ttsAnnouncementSettings.arabicTemplate",
                            )}
                        </Label>
                        <Textarea
                            value={templateAr}
                            onChange={(e) => setTemplateAr(e.target.value)}
                            placeholder={t(
                                "reservationsTranslations.ttsAnnouncementSettings.templatePlaceholder",
                                { name: "{name}" },
                            )}
                            dir="rtl"
                        />
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {t(
                            "reservationsTranslations.ttsAnnouncementSettings.helpText",
                            { name: "{name}" },
                        )}
                    </div>

                    <Button
                        className="w-full"
                        disabled={isPending}
                        onClick={() => {
                            startTransition(async () => {
                                const res = await updateAnnouncementTTSTemplates({
                                    templateEn,
                                    templateAr,
                                });

                                if (res.error) {
                                    toast.error(res.message);
                                    return;
                                }

                                toast.success(
                                    t(
                                        "reservationsTranslations.ttsAnnouncementSettings.savedToast",
                                    ),
                                );
                                setOpen(false);
                            });
                        }}
                    >
                        {t("common.save")}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
