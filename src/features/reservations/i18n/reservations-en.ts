import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    reservationsTranslations: {
        customerName: "Name",
        customerPhone: "Phone",
        totalPrice: "Total Price",
        totalPricePlaceholder: "Enter Total Price",
        totalPaid: "Total Paid",
        totalPaidPlaceholder: "Enter Total Paid",
        startTime: "Start Time",
        endTime: "End Time",
        reservationCode: "Reservation Code",
        reservation: "Reservation",
        reservations: "Reservations",
        status: "Status",
        statuses: "Statuses",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    reserved: "Reserved",
                    started: "Started",
                    ended: "Ended",
                    cancelled: "Cancelled",
                }
            }
        }),
        childPickupAnnouncement: dt(
            "Attention please, {customerName} is ready for pickup.",
            {},
        ),
        childPickupToastTitle: dt(
            "{customerName} is ready for pickup",
            {},
        ),
        childPickupToastDescription: dt(
            "{customerName} reservation ended at {endTime:date}.",
            {
                date: {
                    endTime: {
                        hour: "numeric",
                        minute: "2-digit",
                    },
                },
            },
        ),
    },
} as const satisfies LanguageMessages;
