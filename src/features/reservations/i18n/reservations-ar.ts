import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    reservationsTranslations: {
        customerName: "الاسم",
        customerPhone: "الهاتف",
        totalPrice: "السعر الكلي",
        totalPricePlaceholder: "أدخل السعر الكلي",
        totalPaid: "السعر المدفوع",
        totalPaidPlaceholder: "أدخل السعر المدفوع",
        startTime: "وقت البدء",
        endTime: "وقت الانتهاء",
        reservationCode: "كود الحجز",
        reservation: "منتج",
        reservations: "المنتجات",
        status: "الحالة",
        statuses: "الحالات",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    reserved: "محجوز",
                    started: "بدأ",
                    ended: "انتهى",
                    cancelled: "ملغى",
                }
            }
        }),
        childPickupAnnouncement: dt(
            "يرجى الانتباه، {customerName} جاهز للاستلام.",
            {},
        ),
        childPickupToastTitle: dt(
            "{customerName} جاهز للاستلام",
            {},
        ),
        childPickupToastDescription: dt(
            "انتهى حجز {customerName} عند {endTime:date}.",
            {
                date: {
                    endTime: {
                        hour: "numeric",
                        minute: "2-digit",
                    },
                },
            },
        ),
        playtimeOption: "مدة اللعب",
        playtimeOptions: "مدد اللعب",
        playtimeSettings: {
            title: "مدد اللعب",
            addNew: "إضافة مدة جديدة",
            name: "الاسم",
            durationMinutes: "المدة (بالدقائق)",
            price: "السعر",
            savedToast: "تم حفظ مدة اللعب",
            deletedToast: "تم حذف مدة اللعب",
        },
        ttsAnnouncementSettings: {
            title: "إعدادات نداء الصوت",
            englishTemplate: "نص الإعلان بالإنجليزية",
            arabicTemplate: "نص الإعلان بالعربية",
            templatePlaceholder: "استخدم {name} لإدراج الاسم",
            helpText: "استخدم {name} لإدراج اسم الطفل.",
            savedToast: "تم حفظ نصوص الإعلان الصوتية",
        },
    },
} as const satisfies LanguageMessages;
