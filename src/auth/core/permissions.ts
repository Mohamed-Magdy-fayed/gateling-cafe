import type { Order, Product, User, UserRole } from "@/drizzle/schema";

type PartialUser = Pick<User, "id" | "email" | "role" | "screens">;

type PermissionCheck<Key extends keyof Permissions> =
    | boolean
    | ((user: PartialUser, data: Permissions[Key]["dataType"]) => boolean);

type RolesWithPermissions = {
    [R in UserRole]: Partial<{
        [Key in keyof Permissions]: Partial<{
            [Action in Permissions[Key]["action"]]: PermissionCheck<Key>;
        }>;
    }>;
};

type Permissions = {
    products: {
        dataType: Partial<Product>;
        action: "view" | "update" | "create" | "delete";
    };
    orders: {
        dataType: Partial<Order>;
        action: "view" | "update" | "create" | "delete";
    };
};

const unrestricted = {
    create: true,
    view: true,
    update: true,
    delete: true,
};

const ROLES = {
    admin: {
        products: unrestricted,
        orders: unrestricted,
    },
    user: {
        products: {
            view: true,
        },
        orders: unrestricted,
    },
} as const satisfies RolesWithPermissions;

export function hasPermission<Resource extends keyof Permissions>(
    user: PartialUser,
    resource: Resource,
    action: Permissions[Resource]["action"],
    data?: Permissions[Resource]["dataType"],
) {
    const permission = (ROLES as RolesWithPermissions)[user.role][resource]?.[
        action
    ];
    if (permission == null) return false;

    if (typeof permission === "boolean") return permission;
    return data != null && permission(user, data);
}
