import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    ordersTranslations: {
        name: "الاسم",
        order: "الطلب",
        orders: "الطلبات",
        status: "الحالة",
        statuses: "الحالات",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    created: "جديد",
                    preparing: "قيد التحضير",
                    completed: "مكتمل",
                    cancelled: "ملغى",
                }
            }
        }),
        orderNumber: "رقم الطلب",
        customerName: "اسم العميل",
        customerNamePlaceholder: "أدخل اسم العميل",
        customerPhone: "هاتف العميل",
        customerPhonePlaceholder: "أدخل هاتف العميل",
        totalPaid: "المبلغ المدفوع",
        totalPaidPlaceholder: "أدخل المبلغ المدفوع من قبل العميل",
        orderTotal: "إجمالي الطلب",
        orderItems: "عناصر الطلب",
        addProduct: "إضافة منتج",
        product: "المنتج",
        selectProduct: "اختر منتجًا",
        removeProduct: "إزالة المنتج",
    },
} as const satisfies LanguageMessages;
