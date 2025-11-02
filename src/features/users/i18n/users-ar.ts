import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    usersTranslations: {
        updateRole: "تعديل الدور",
        phone: "الهاتف",
        role: "الدور",
        screens: "الشاشات",
        screenNames: {
            dashboard: "لوحة التحكم",
            branches: "الفروع",
            dresses: "الفساتين",
            users: "الموظفين",
            reservations: "الحجوزات",
            customers: "العملاء",
            settings: "الإعدادات",
        },
    },
} as const satisfies LanguageMessages;
