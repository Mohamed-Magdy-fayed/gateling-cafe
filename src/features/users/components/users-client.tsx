"use client";

import { PlusSquareIcon } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSheet } from "@/components/data-table/data-table-sheet";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { User } from "@/drizzle/schema";
import { UsersActionBar } from "@/features/users/components/users-action-bar";
import { getUsersColumns } from "@/features/users/components/users-columns";
import { UsersForm } from "@/features/users/components/users-form";
import { useDataTable } from "@/hooks/use-data-table";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function UsersClient({ users }: { users: User[] }) {
    const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);

    const { table } = useDataTable({
        columns: getUsersColumns({
            createdAt: t("common.createdAt"),
            email: t("auth.email"),
            name: t("forms.name"),
            phone: t("usersTranslations.phone"),
            role: t("usersTranslations.role"),
        }),
        data: users,
    });

    return (
        <DataTable table={table}>
            <UsersActionBar table={table} />
            <DataTableToolbar table={table}>
                <DataTableSheet
                    open={isOpen}
                    onOpenChange={(val) => setIsOpen(val)}
                    trigger={
                        <Button size="sm">
                            <PlusSquareIcon className="size-4" />
                            {t("common.add")}
                        </Button>
                    }
                    content={<UsersForm setIsOpen={setIsOpen} />}
                />
            </DataTableToolbar>
        </DataTable>
    );
}
