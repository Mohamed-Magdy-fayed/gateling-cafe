"use client";

import type { Table } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import ExportForm from "@/components/data-table/data-table-export-form";
import { ModalSheetComponent } from "@/components/general/modal-sheet-compo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/drizzle/schema";
import { deleteUsers } from "@/features/users/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

const actions = ["update-role", "export", "delete"] as const;

type Action = (typeof actions)[number];

interface UsersActionBarProps {
  table: Table<User>;
}

export function UsersActionBar({ table }: UsersActionBarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);
  const [isExportFormOpen, setIsExportFormOpen] =
    React.useState<boolean>(false);

  const getIsActionPending = React.useCallback(
    (action: Action) => isPending && currentAction === action,
    [isPending, currentAction],
  );

  const onUserDelete = React.useCallback(async () => {
    setCurrentAction("delete");
    startTransition(async () => {
      const count = await deleteUsers(rows.map((row) => row.original.id));

      if (!count) {
        toast.error(t("error", { error: "" }));
        return;
      }
      table.toggleAllRowsSelected(false);
      toast.success(t("success"));
      router.refresh();
    });
  }, [rows, table]);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <ExportForm
          data={rows.map((row) => row.original)}
          selectedData={rows.map((row) => row.original)}
          fileName="users.csv"
          sheetName="Users"
          isLoading={getIsActionPending("export")}
          isOpen={isExportFormOpen}
          setIsOpen={setIsExportFormOpen}
        />
        <ModalSheetComponent
          isOpen={currentAction === "delete"}
          onOpenChange={() => setCurrentAction(null)}
          confirmButton={
            <Button onClick={onUserDelete}>{t("common.delete")}</Button>
          }
          title={t("common.delete")}
          description={t("common.areYouSure")}
        />
        <DataTableActionBarAction
          variant="destructive"
          size="icon"
          tooltip={t("common.delete")}
          className="border-destructive"
          isPending={getIsActionPending("delete")}
          onClick={() => setCurrentAction("delete")}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
