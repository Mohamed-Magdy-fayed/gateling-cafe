"use client";

import { Settings2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    deletePlaytimeOption,
    getPlaytimeOptions,
    upsertPlaytimeOption,
} from "@/features/reservations/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Draft = {
    id?: string;
    name: string;
    durationMinutes: number | null;
    price: number | null;
};

export function PlaytimeOptionsSettingsSheet() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [rows, setRows] = useState<Draft[]>([]);
    const [newRow, setNewRow] = useState<Draft>({
        name: "",
        durationMinutes: null,
        price: null,
    });

    const canSaveNew = useMemo(
        () =>
            newRow.name.trim().length > 0 &&
            (newRow.durationMinutes ?? 0) > 0 &&
            (newRow.price ?? -1) >= 0,
        [newRow],
    );

    useEffect(() => {
        if (!open) return;

        startTransition(async () => {
            const res = await getPlaytimeOptions();
            if (res.error) {
                toast.error(res.message);
                return;
            }

            setRows(
                res.data.map((r) => ({
                    id: r.id,
                    name: r.name,
                    durationMinutes: r.durationMinutes,
                    price: r.price,
                })),
            );
        });
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                    <Settings2Icon className="size-4" />
                    {t("reservationsTranslations.playtimeSettings.title")}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {t("reservationsTranslations.playtimeSettings.title")}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-4 p-4">
                    <div className="space-y-3">
                        {rows.map((row, idx) => (
                            <div key={row.id ?? idx} className="grid grid-cols-1 gap-2">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <Input
                                        value={row.name}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setRows((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx ? { ...p, name: value } : p,
                                                ),
                                            );
                                        }}
                                        placeholder={t(
                                            "reservationsTranslations.playtimeSettings.name",
                                        )}
                                    />

                                    <NumberInput
                                        value={row.durationMinutes}
                                        onChange={(value) => {
                                            setRows((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx ? { ...p, durationMinutes: value } : p,
                                                ),
                                            );
                                        }}
                                        placeholder={t(
                                            "reservationsTranslations.playtimeSettings.durationMinutes",
                                        )}
                                    />

                                    <NumberInput
                                        value={row.price}
                                        onChange={(value) => {
                                            setRows((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx ? { ...p, price: value } : p,
                                                ),
                                            );
                                        }}
                                        placeholder={t(
                                            "reservationsTranslations.playtimeSettings.price",
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() => {
                                            startTransition(async () => {
                                                const res = await upsertPlaytimeOption({
                                                    id: row.id,
                                                    name: row.name,
                                                    durationMinutes: row.durationMinutes ?? 0,
                                                    price: row.price ?? 0,
                                                });

                                                if (res.error) {
                                                    toast.error(res.message);
                                                    return;
                                                }

                                                toast.success(
                                                    t(
                                                        "reservationsTranslations.playtimeSettings.savedToast",
                                                    ),
                                                );
                                            });
                                        }}
                                    >
                                        {t("common.save")}
                                    </Button>
                                    {row.id ? (
                                        <Button
                                            variant="destructive"
                                            disabled={isPending}
                                            onClick={() => {
                                                startTransition(async () => {
                                                    const id = row.id;
                                                    if (!id) return;

                                                    const res = await deletePlaytimeOption(id);
                                                    if (res.error) {
                                                        toast.error(res.message);
                                                        return;
                                                    }
                                                    setRows((prev) =>
                                                        prev.filter((p) => p.id !== row.id),
                                                    );
                                                    toast.success(
                                                        t(
                                                            "reservationsTranslations.playtimeSettings.deletedToast",
                                                        ),
                                                    );
                                                });
                                            }}
                                        >
                                            <Trash2Icon className="size-4" />
                                            {t("common.delete")}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {t("reservationsTranslations.playtimeSettings.addNew")}
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Input
                                value={newRow.name}
                                onChange={(e) =>
                                    setNewRow((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder={t(
                                    "reservationsTranslations.playtimeSettings.name",
                                )}
                            />
                            <NumberInput
                                value={newRow.durationMinutes}
                                onChange={(value) =>
                                    setNewRow((p) => ({ ...p, durationMinutes: value }))
                                }
                                placeholder={t(
                                    "reservationsTranslations.playtimeSettings.durationMinutes",
                                )}
                            />
                            <NumberInput
                                value={newRow.price}
                                onChange={(value) => setNewRow((p) => ({ ...p, price: value }))}
                                placeholder={t(
                                    "reservationsTranslations.playtimeSettings.price",
                                )}
                            />
                        </div>
                        <Button
                            className="w-full"
                            disabled={isPending || !canSaveNew}
                            onClick={() => {
                                startTransition(async () => {
                                    const res = await upsertPlaytimeOption({
                                        name: newRow.name,
                                        durationMinutes: newRow.durationMinutes ?? 0,
                                        price: newRow.price ?? 0,
                                    });

                                    if (res.error) {
                                        toast.error(res.message);
                                        return;
                                    }

                                    setRows((prev) => [
                                        ...prev,
                                        {
                                            id: res.data.id,
                                            name: res.data.name,
                                            durationMinutes: res.data.durationMinutes,
                                            price: res.data.price,
                                        },
                                    ]);

                                    setNewRow({ name: "", durationMinutes: null, price: null });
                                    toast.success(
                                        t("reservationsTranslations.playtimeSettings.savedToast"),
                                    );
                                });
                            }}
                        >
                            {t("common.add")}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
