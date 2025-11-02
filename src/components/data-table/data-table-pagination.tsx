"use client";

import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation();
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRowCount = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8",
        className,
      )}
      {...props}
    >
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {t("dataTable.rowsSelected", {
          selected: selectedRowCount,
          rows: totalRowCount,
        })}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">
            {t("dataTable.rowsPerPage")}
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem] [&[data-size]]:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          {t("dataTable.pageOf", { page: pageIndex + 1, total: totalPages })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label={t("dataTable.goToFirstPage")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex rtl:-scale-x-100"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label={t("dataTable.goToPreviousPage")}
            variant="outline"
            size="icon"
            className="size-8 rtl:-scale-x-100"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label={t("dataTable.goToNextPage")}
            variant="outline"
            size="icon"
            className="size-8 rtl:-scale-x-100"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label={t("dataTable.goToLastPage")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex rtl:-scale-x-100"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
