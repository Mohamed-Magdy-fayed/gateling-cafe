import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    usersTranslations: {
        updateRole: "Update Role",
        phone: "Phone",
        role: "Role",
        screens: "Screens",
        screenNames: {
            dashboard: "Dashboard",
            branches: "Branches",
            dresses: "Dresses",
            users: "Employees",
            reservations: "Reservations",
            customers: "Customers",
            settings: "Settings",
        },
    },
} as const satisfies LanguageMessages;
