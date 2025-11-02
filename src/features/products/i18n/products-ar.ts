import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    productsTranslations: {
        name: "الاسم",
        product: "منتج",
        products: "المنتجات",
        price: "السعر",
        pricePlaceholder: "أدخل سعر المنتج",
        category: "الفئة",
        categories: "الفئات",
        categoryNames: dt("{categoryName:enum}", {
            enum: {
                categoryName: {
                    coffee: "قهوة",
                    tea: "شاي",
                    juice: "عصير",
                    smoothie: "سموذي",
                    pastry: "معجنات",
                    dessert: "حلويات",
                    sandwich: "ساندويتش",
                    salad: "سلطة",
                    breakfast: "فطور",
                    snack: "وجبة خفيفة",
                    other: "أخرى",
                }
            }
        }),
        type: "نوع",
        types: "الأنواع",
        typeNames: dt("{typeName:enum}", {
            enum: {
                typeName: {
                    beverage: "مشروب",
                    food: "طعام",
                    merchandise: "بضائع",
                    addon: "إضافة",
                }
            }
        }),
        status: "الحالة",
        statuses: "الحالات",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    active: "نشط",
                    inactive: "غير نشط",
                    archived: "مؤرشف"
                }
            }
        }),
        images: "الصور"
    },
} as const satisfies LanguageMessages;
