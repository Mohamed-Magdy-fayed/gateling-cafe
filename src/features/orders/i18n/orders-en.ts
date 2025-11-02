import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    ordersTranslations: {
        name: "Name",
        order: "Order",
        orders: "Orders",
        status: "Status",
        statuses: "Statuses",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    created: "Created",
                    preparing: "Preparing",
                    completed: "Completed",
                    cancelled: "Cancelled",
                }
            }
        }),
        orderNumber: "Order Number",
        customerName: "Customer Name",
        customerNamePlaceholder: "Enter customer name",
        customerPhone: "Customer Phone",
        customerPhonePlaceholder: "Enter customer phone",
        totalPaid: "Total Paid",
        totalPaidPlaceholder: "Enter the amount paid by the customer",
        orderTotal: "Order Total",
        orderItems: "Order Items",
        addProduct: "Add Product",
        product: "Product",
        selectProduct: "Select Product",
        removeProduct: "Remove Product",
    },
} as const satisfies LanguageMessages;
