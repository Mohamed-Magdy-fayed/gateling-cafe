"use client"

import * as React from "react";
import { Clock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Input } from "@/components/ui/input";
import { ControllerRenderProps } from "react-hook-form";

interface SelectTimeFieldProps {
    value?: Date;
    setValue: (value: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    title?: string;
}

export function SelectTimeField({
    value,
    setValue,
    placeholder,
    disabled = false,
    className,
    title,
}: SelectTimeFieldProps) {
    const { t } = useTranslation();
    const timeInputRef = React.useRef<HTMLInputElement>(null);

    const onTimeChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const timeValue = event.target.value;
            if (!timeValue) {
                setValue(undefined);
                return;
            }

            const [hours, minutes] = timeValue.split(':').map(Number);

            // Create a new Date object based on the existing value or current date
            const newDate = value ? new Date(value) : new Date();
            newDate.setHours(hours!, minutes, 0, 0);
            setValue(newDate);
        },
        [value, setValue],
    );

    const onReset = React.useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
            setValue(undefined);
        },
        [setValue],
    );

    const hasValue = !!value;

    // Format the time for the native time input (HH:mm)
    const currentTimeValue = React.useMemo(() => {
        if (!value) return "";
        const hours = value.getHours().toString().padStart(2, '0');
        const minutes = value.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }, [value]);

    // Format the time for display (e.g., 02:30 PM)
    const displayText = React.useMemo(() => {
        if (!hasValue) {
            return placeholder || t("common.selectTime");
        }
        return value.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }, [hasValue, value, placeholder, t]);

    const clearLabel = t("common.clearTime");

    // This is the main display label, combining title and value
    const label = React.useMemo(() => {
        if (!title) return null;

        return (
            <span className="flex items-center gap-2">
                <span>{title}</span>
                {hasValue && (
                    <>
                        <Separator
                            orientation="vertical"
                            className="mx-0.5 data-[orientation=vertical]:h-4"
                        />
                        <span className="text-muted-foreground">{displayText}</span>
                    </>
                )}
            </span>
        );
    }, [title, hasValue, displayText]);

    return (
        <Button
            variant="outline"
            className={cn(
                "w-full justify-start",
                title && "border-dashed",
                !hasValue && "text-muted-foreground",
                className,
            )}
            disabled={disabled}
            type="button"
            aria-label={label ? undefined : displayText}
        >
            <div className="flex items-center gap-2 w-full">
                {hasValue && !disabled ? (
                    <div
                        role="button"
                        aria-label={clearLabel}
                        tabIndex={0}
                        onClick={onReset}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onReset(e as any);
                            }
                        }}
                        // The clear button needs a higher z-index to be clickable
                        className="relative rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        style={{ zIndex: 2 }}
                    >
                        <XCircle className="h-4 w-4" />
                    </div>
                ) : (
                    <Clock className="h-4 w-4 shrink-0" />
                )}
                {label}
                <Input
                    ref={timeInputRef}
                    type="time"
                    value={currentTimeValue}
                    onChange={onTimeChange}
                    disabled={disabled}
                    className="w-full h-full cursor-pointer border-0 !bg-transparent !ring-0"
                />
            </div>
        </Button>
    );
}

export function handleTimeChange(field: ControllerRenderProps<any>, newTime: Date | undefined) {
    if (!newTime) {
        return;
    }
    const combinedDate = field.value ? new Date(field.value) : new Date();
    combinedDate.setHours(newTime.getHours());
    combinedDate.setMinutes(newTime.getMinutes());
    field.onChange(combinedDate);
};
