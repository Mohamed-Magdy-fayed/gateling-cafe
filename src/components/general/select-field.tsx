"use client";

import { Check, PlusCircle, XCircle } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface Option<TData> {
  label: string | React.ReactNode;
  value: TData;
  isDisabled?: boolean;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface SelectFieldProps<TData> {
  values: TData[];
  setValues: (values: TData[]) => void;
  title?: string;
  options: Option<TData>[];
  multiple?: boolean;
  disabled?: boolean;
}

export function SelectField<TData>({
  values,
  setValues,
  title,
  options,
  multiple,
  disabled,
}: SelectFieldProps<TData>) {
  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);

  const selectedValues = React.useMemo(() => new Set(values), [values]);

  const onItemSelect = React.useCallback(
    (option: Option<TData>, isSelected: boolean) => {
      if (multiple) {
        const newSelectedValues = new Set(values);
        if (isSelected) {
          newSelectedValues.delete(option.value);
        } else {
          newSelectedValues.add(option.value);
        }
        const filterValues = Array.from(newSelectedValues);
        setValues(filterValues.length ? filterValues : []);
      } else {
        setValues(isSelected ? [] : [option.value]);
        setOpen(false);
      }
    },
    [multiple, values, setValues],
  );

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      setValues([]);
    },
    [setValues],
  );

  const handleWheel = (event: React.WheelEvent) => {
    // This stops the scroll event from propagating to the parent (the Sheet)
    event.stopPropagation();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed"
          disabled={disabled}
        >
          {selectedValues.size !== 0 ? (
            <div
              onClick={onReset}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          {selectedValues.size === 0 && title}
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {t("dataTable.selected", { count: selectedValues.size })}
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={`${title}-${option.value}-selected`}
                        className="rounded-sm px-1 py-0 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" onWheel={handleWheel}>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>{t("dataTable.noResults")}</CommandEmpty>
            <CommandGroup className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    key={`${title}-${option.value}-command`}
                    onSelect={() => onItemSelect(option, isSelected)}
                    disabled={option.isDisabled}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="rtl:scale-100" />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate">{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="justify-center text-center"
                  >
                    {t("common.clear")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
