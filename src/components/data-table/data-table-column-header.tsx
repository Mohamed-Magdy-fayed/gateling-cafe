"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  EyeOff,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentProps<typeof DropdownMenuTrigger> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { t } = useTranslation();

  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <DropdownMenu>
      <div className="flex items-center gap-2 justify-between px-2">
        {title}
        <DropdownMenuTrigger
          className={cn(className)}
          asChild
          {...props}
        >
          <Button variant="ghost" size="sm">
            {column.getCanSort() &&
              (column.getIsSorted() === "desc" ? (
                <ChevronDown />
              ) : column.getIsSorted() === "asc" ? (
                <ChevronUp />
              ) : (
                <ChevronsUpDown />
              ))}
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="start" className="w-28">
        {column.getCanSort() && (
          <>
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-foreground"
              checked={column.getIsSorted() === "asc"}
              onClick={() => column.toggleSorting(false)}
            >
              <ChevronUp />
              {t("dataTable.asc")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-foreground"
              checked={column.getIsSorted() === "desc"}
              onClick={() => column.toggleSorting(true)}
            >
              <ChevronDown />
              {t("dataTable.desc")}
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() && (
              <DropdownMenuItem
                className="pl-2 [&_svg]:text-muted-foreground"
                onClick={() => column.clearSorting()}
              >
                <X />
                {t("dataTable.reset")}
              </DropdownMenuItem>
            )}
          </>
        )}
        {column.getCanHide() && (
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
            checked={!column.getIsVisible()}
            onClick={() => column.toggleVisibility(false)}
          >
            <EyeOff />
            {t("dataTable.hide")}
          </DropdownMenuCheckboxItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const selectColumn = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="translate-y-0.5"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className="translate-y-0.5"
    />
  ),
  enableSorting: false,
  enableHiding: false,
  size: 40,
} satisfies ColumnDef<any>;
