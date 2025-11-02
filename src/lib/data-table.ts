import { dataTableConfig } from "@/config/data-table";
import { cn } from "@/lib/utils";
import { FilterVariant, FilterOperator, ExtendedColumnFilter } from "@/types/data-table";
import type { Column, FilterFn } from "@tanstack/react-table";
import { endOfDay, startOfDay } from "date-fns";

export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>;
  withBorder?: boolean;
}): string {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  const classes: (string | undefined | false)[] = [];

  if (isPinned) {
    classes.push(
      "sticky",
      "z-10",
      "bg-inherit",
    );

    if (isPinned === "left") {
      classes.push("start-0");
    } else if (isPinned === "right") {
      classes.push("end-0");
    }

    if (withBorder) {
      classes.push(
        isLastLeftPinnedColumn && "shadow-[-4px_0_4px_-4px_hsl(var(--border))_inset]",
        isFirstRightPinnedColumn && "shadow-[4px_0_4px_-4px_hsl(var(--border))_inset]"
      );
    }
  } else {
    classes.push("relative");
  }

  return cn(classes);
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<
    FilterVariant,
    { label: string; value: FilterOperator }[]
  > = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq");
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[],
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== "" &&
        filter.value !== null &&
        filter.value !== undefined),
  );
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}

export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, filter) => {
  if (filter === undefined || filter === null) {
    return true;
  }

  const value = toDate(row.getValue(columnId));
  if (!value) {
    return false;
  }

  const valueTime = value.getTime();

  const applyRange = (
    range: Array<number | string | undefined>,
  ): boolean => {
    const [fromRaw, toRaw] = range;
    const fromDate = toDate(fromRaw);
    const toDateValue = toDate(toRaw);

    const fromTime = fromDate ? startOfDay(fromDate).getTime() : undefined;
    const toTime = toDateValue ? endOfDay(toDateValue).getTime() : undefined;

    if (fromTime !== undefined && valueTime < fromTime) {
      return false;
    }

    if (toTime !== undefined && valueTime > toTime) {
      return false;
    }

    return true;
  };

  if (Array.isArray(filter)) {
    return applyRange(filter);
  }

  const targetDate = toDate(filter);
  if (!targetDate) {
    return true;
  }

  const start = startOfDay(targetDate).getTime();
  const end = endOfDay(targetDate).getTime();

  return valueTime >= start && valueTime <= end;
};
