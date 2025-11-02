import type { ColumnDef } from "@tanstack/react-table";
import {
    DataTableColumnHeader,
    selectColumn,
} from "@/components/data-table/data-table-column-header";
import type { User } from "@/drizzle/schema";
import { UsersActions } from "@/features/users/components/users-actions";
import { formatDate } from "@/lib/format";

type Translations = {
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    role: string;
};

export const getUsersColumns = ({
    name,
    email,
    phone,
    createdAt,
    role,
}: Translations) => {
    return [
        selectColumn,
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={name} />
            ),
            meta: {
                label: name,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "email",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={email} />
            ),
            meta: {
                label: email,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "phone",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={phone} />
            ),
            meta: {
                label: phone,
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={createdAt} />
            ),
            cell: ({ row }) => formatDate(row.original.createdAt),
            meta: {
                label: createdAt,
                variant: "dateRange",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "role",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={role} />
            ),
            enableColumnFilter: true,
        },
        {
            id: "actions",
            maxSize: 10,
            cell: ({ row }) => <UsersActions user={row.original} />,
        },
    ] satisfies ColumnDef<User>[];
};
