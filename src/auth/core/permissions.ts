import type { Order, Product, Reservation, User, UserRole } from "@/drizzle/schema";

type PartialUser = Pick<User, "id" | "email" | "role" | "screens">;
type DefaultAction = "view" | "update" | "create" | "delete";

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
        action: DefaultAction;
    };
    orders: {
        dataType: Partial<Order>;
        action: DefaultAction;
    };
    users: {
        dataType: Partial<User>;
        action: DefaultAction;
    };
    reservations: {
        dataType: Partial<Reservation>;
        action: DefaultAction;
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
        users: unrestricted,
        reservations: unrestricted,
    },
    user: {
        products: {
            view: true,
        },
        orders: unrestricted,
        users: {
            view: true,
            create: true,
            update: (user, data) => user.id === data.id,
            delete: false,
        },
        reservations: unrestricted,
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
