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
        orderTotalHelper: "يتم تحديث الإجمالي تلقائيًا أثناء إنشاء الطلب.",
        orderItems: "عناصر الطلب",
        orderItemsHelper: "اختر المنتج والكمية لإضافتهما إلى الطلب.",
        addProduct: "إضافة منتج",
        product: "المنتج",
        selectProduct: "اختر منتجًا",
        removeProduct: "إزالة المنتج",
        qty: "الكمية",
        unitPrice: "سعر الوحدة",
        lineTotal: "إجمالي البند",
        qtyHelper: "استخدم الأسهم أو اكتب رقم الكمية.",
        itemsEmpty: "ابدأ بإضافة المنتج الأول إلى الطلب.",
        orderSummary: "ملخص الطلب",
        itemsSubtotal: "إجمالي العناصر",
        amountPaid: "المبلغ المدفوع",
        balanceDue: "المتبقي",
        totalPaidHelper: "سجل المبلغ الذي دفعه العميل نقدًا أو بالبطاقة.",
    },
} as const satisfies LanguageMessages;
