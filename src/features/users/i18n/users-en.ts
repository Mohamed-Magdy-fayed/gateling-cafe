import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    usersTranslations: {
        updateRole: "Update Role",
        phone: "Phone",
        role: "Role",
        screens: "Screens",
        screenNames: {
            dashboard: "Dashboard",
            users: "Employees",
            products: "Products",
            customers: "Customers",
            orders: "Orders",
            reservations: "Reservations",
            playground: "Playground",
        },
    },
} as const satisfies LanguageMessages;
