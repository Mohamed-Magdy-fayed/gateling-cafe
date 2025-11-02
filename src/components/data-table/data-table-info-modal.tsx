"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    Calendar,
    User,
    Clock,
    Pencil,
    Trash2,
    Info,
    FileX2,
} from "lucide-react";
import { type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { H3 } from "@/components/ui/typography";
import { formatDate } from "@/lib/format";

interface DataTableInfoModalProps<TData> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entity?: TData;
    entityName?: string;
}

function InfoRow({
    icon,
    label,
    value,
    locale,
}: {
    icon: ReactNode;
    label: string;
    value?: string | null | Date;
    locale?: string;
}) {
    if (!value) return null;

    const displayValue = value instanceof Date ? formatDate(value, { hour: "numeric", minute: "numeric", second: "numeric" }) : value;

    return (
        <div className="flex items-start gap-2 space-x-4 rtl:space-x-reverse">
            <div className="text-muted-foreground">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{displayValue}</p>
            </div>
        </div>
    );
}

export default function DataTableInfoModal<TData>({
    open,
    onOpenChange,
    entity,
    entityName = "Item",
}: DataTableInfoModalProps<TData>) {
    const { t, locale } = useTranslation();

    const isValidEntity = typeof entity === "object"
        && entity !== null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t("common.entityInformationTitle", { entity: entityName })}
                    </DialogTitle>
                    <DialogDescription>
                        {t("common.entityInformationDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Main Information Section */}
                    {isValidEntity
                        && "id" in entity
                        && typeof entity.id === "string"
                        && (
                            <InfoRow
                                icon={<Info size={18} />}
                                label={t("common.code")}
                                value={entity.id}
                            />
                        )}

                    <Separator />

                    {/* Audit Trail Section */}
                    <H3 className="text-sm font-semibold">{t("common.auditTrail")}</H3>
                    <div className="grid grid-cols-2 gap-4">
                        {isValidEntity &&
                            "createdAt" in entity && (
                                <InfoRow
                                    icon={<Calendar size={18} />}
                                    label={t("common.createdAt")}
                                    value={entity.createdAt as Date || ""}
                                    locale={locale}
                                />
                            )}
                        {isValidEntity && "createdBy" in entity && typeof entity.createdBy === "string" && (
                            <InfoRow
                                icon={<User size={18} />}
                                label={t("common.createdBy")}
                                value={entity.createdBy}
                                locale={locale}
                            />
                        )}
                        {isValidEntity && "updatedAt" in entity && (
                            <InfoRow
                                icon={<Clock size={18} />}
                                label={t("common.updatedAt")}
                                value={entity.updatedAt as Date || ""}
                                locale={locale}
                            />
                        )}
                        {isValidEntity && "updatedBy" in entity && typeof entity.updatedBy === "string" && (
                            <InfoRow
                                icon={<Pencil size={18} />}
                                label={t("common.updatedBy")}
                                value={entity.updatedBy}
                                locale={locale}
                            />
                        )}
                        {isValidEntity && "deletedAt" in entity && (
                            <InfoRow
                                icon={<FileX2 size={18} />}
                                label={t("common.deletedAt")}
                                value={entity.deletedAt as Date || ""}
                                locale={locale}
                            />
                        )}
                        {isValidEntity && "deletedBy" in entity && typeof entity.deletedBy === "string" && (
                            <InfoRow
                                icon={<Trash2 size={18} />}
                                label={t("common.deletedBy")}
                                value={entity.deletedBy}
                                locale={locale}
                            />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

