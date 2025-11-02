import { H3 } from "@/components/ui/typography";
import { getUsers } from "@/features/users/actions";
import { UsersClient } from "@/features/users/components/users-client";
import { ServerTranslate } from "@/lib/i18n/ServerTranslate";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="container mx-auto p-4 space-y-4">
            <H3><ServerTranslate k="users" /></H3>
            <UsersClient users={users} />
        </div>
    );
}


