import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';
import { CheckIcon, DownloadCloudIcon, XCircleIcon } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { exportToCsv } from '@/lib/export';
import { StringKeyOf } from '@/types/data-table';
import { DataTableActionBarAction } from '@/components/data-table/data-table-action-bar';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ExportForm<TData>({ data, fileName, sheetName, selectedData, handleExport, isOpen, setIsOpen, isLoading }: {
    data: TData[]; fileName: string; sheetName: string; isLoading: boolean; selectedData: TData[];
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    handleExport?: (keys: Extract<keyof TData, string>[]) => void;
}) {
    const { t } = useTranslation();

    const [exportKeys, setExportKeys] = useState<StringKeyOf<TData>[]>([]);

    const onItemSelect = useCallback(
        (key: StringKeyOf<TData>, isSelected: boolean) => {
            const newSelectedValues = new Set(exportKeys);
            if (isSelected) {
                newSelectedValues.delete(key);
            } else {
                newSelectedValues.add(key);
            }
            const filterValues = Array.from(newSelectedValues);
            setExportKeys(filterValues.length ? filterValues : []);
        },
        [exportKeys],
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <DataTableActionBarAction variant="outline" size="sm" className="border-dashed">
                    {exportKeys.length > 0 ? (
                        <div
                            role="button"
                            aria-label={"Clear selection"}
                            tabIndex={0}
                            onClick={() => setExportKeys([])}
                            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <XCircleIcon />
                        </div>
                    ) : (
                        <DownloadCloudIcon />
                    )}
                    {t("dataTable.export.export")}
                    {exportKeys.length > 0 && (
                        <>
                            <Separator
                                orientation="vertical"
                                className="mx-0.5 data-[orientation=vertical]:h-4"
                            />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {exportKeys.length}
                            </Badge>
                            <div className="hidden items-center gap-1 lg:flex">
                                {exportKeys.length > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {t("dataTable.selected", { count: exportKeys.length })}
                                    </Badge>
                                ) : (
                                    exportKeys
                                        .filter((key) => exportKeys.includes(key))
                                        .map((key) => (
                                            <Badge
                                                variant="secondary"
                                                key={key}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {key}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </DataTableActionBarAction>
            </PopoverTrigger>
            <PopoverContent className="w-[12.5rem] p-0" align="start">
                <Command>
                    <CommandInput placeholder={t("dataTable.export.searchPlaceholder")} />
                    <CommandList className="max-h-full">
                        <CommandEmpty>{t("dataTable.noResults")}</CommandEmpty>
                        <CommandGroup className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
                            {data[0] ? Object.keys(data[0]).map((key) => {
                                const isSelected = exportKeys.includes(key as StringKeyOf<TData>);

                                return (
                                    <CommandItem
                                        key={key}
                                        onSelect={() => onItemSelect(key as StringKeyOf<TData>, isSelected)}
                                    >
                                        <div
                                            className={cn(
                                                "flex size-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary"
                                                    : "opacity-50 [&_svg]:invisible",
                                            )}
                                        >
                                            <CheckIcon className="rtl:scale-100 dark:text-foreground text-background" />
                                        </div>
                                        <span className="truncate">{key}</span>
                                    </CommandItem>
                                );
                            }) : null}
                        </CommandGroup>
                        {exportKeys.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            setIsOpen(false)
                                            if (selectedData.length > 0) {
                                                const exportData = selectedData.map((item) =>
                                                    exportKeys.reduce((acc, key) => {
                                                        acc[key] = item[key];
                                                        return acc;
                                                    }, {} as Partial<TData>)
                                                );
                                                return exportToCsv(exportData, fileName)
                                            }
                                            handleExport
                                                ? handleExport(exportKeys)
                                                : exportToCsv(data.map((item) =>
                                                    exportKeys.reduce((acc, key) => {
                                                        acc[key] = item[key];
                                                        return acc;
                                                    }, {} as Partial<TData>)
                                                ), fileName);
                                        }}
                                        className="justify-center text-center"
                                    >
                                        {t("dataTable.export.export")}
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

