import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    usersTranslations: {
        updateRole: "تعديل الدور",
        phone: "الهاتف",
        role: "الدور",
        screens: "الشاشات",
        screenNames: {
            dashboard: "لوحة التحكم",
            users: "الموظفين",
            products: "المنتجات",
            customers: "العملاء",
            orders: "الطلبات",
            reservations: "الحجوزات",
            playground: "الملعب",
        },
    },
} as const satisfies LanguageMessages;
