"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type FilterFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type VisibilityState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { dateRangeFilterFn } from "@/lib/data-table";

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state"
    | "pageCount"
    | "getCoreRowModel"
    | "manualFiltering"
    | "manualPagination"
    | "manualSorting"
  > {
  initialState?: Partial<TableState>;
}

const functionalUpdate = <T,>(updater: Updater<T>, previous: T): T =>
  typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    data,
    initialState,
    onSortingChange: onSortingChangeProp,
    onColumnFiltersChange: onColumnFiltersChangeProp,
    onColumnVisibilityChange: onColumnVisibilityChangeProp,
    onPaginationChange: onPaginationChangeProp,
    onRowSelectionChange: onRowSelectionChangeProp,
    enableRowSelection = true,
    ...tableProps
  } = props;

  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? [{ id: "createdAt", desc: true }],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [pagination, setPagination] = React.useState<PaginationState>(() => ({
    pageIndex: initialState?.pagination?.pageIndex ?? 0,
    pageSize: initialState?.pagination?.pageSize ?? 10,
  }));

  const handleSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      setSorting((previous) => {
        const next = functionalUpdate(updater, previous);
        onSortingChangeProp?.(next);
        return next;
      });
    },
    [onSortingChangeProp],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setColumnFilters((previous) => {
        const next = functionalUpdate(updater, previous);
        onColumnFiltersChangeProp?.(next);
        return next;
      });
    },
    [onColumnFiltersChangeProp],
  );

  const handleColumnVisibilityChange = React.useCallback(
    (updater: Updater<VisibilityState>) => {
      setColumnVisibility((previous) => {
        const next = functionalUpdate(updater, previous);
        onColumnVisibilityChangeProp?.(next);
        return next;
      });
    },
    [onColumnVisibilityChangeProp],
  );

  const handlePaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      setPagination((previous) => {
        const next = functionalUpdate(updater, previous);
        onPaginationChangeProp?.(next);
        return next;
      });
    },
    [onPaginationChangeProp],
  );

  const handleRowSelectionChange = React.useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((previous) => {
        const next = functionalUpdate(updater, previous);
        onRowSelectionChangeProp?.(next);
        return next;
      });
    },
    [onRowSelectionChangeProp],
  );

  const processedColumns = React.useMemo(() => {
    const applyDefaults = (
      column: ColumnDef<TData, unknown>,
    ): ColumnDef<TData, unknown> => {
      const variant = column.meta?.variant;
      const next = { ...column } as ColumnDef<TData, unknown> & {
        columns?: ColumnDef<TData, unknown>[];
      };

      if (column && "columns" in column && Array.isArray(column.columns)) {
        next.columns = column.columns.map(applyDefaults);
      }

      if (
        (variant === "date" || variant === "dateRange") &&
        next.filterFn === undefined
      ) {
        next.filterFn = dateRangeFilterFn as FilterFn<TData>;
      }

      return next;
    };

    return columns.map(applyDefaults);
  }, [columns]);

  const table = useReactTable({
    ...tableProps,
    data,
    columns: processedColumns,
    initialState: {
      ...initialState,
      columnPinning: {
        right: ["actions"],
        left: ["select"],
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
  });

  return { table };
}
