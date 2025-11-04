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
        orderTotalHelper: "Totals refresh automatically as you build the order.",
        orderItems: "Order Items",
        orderItemsHelper: "Pick a product and quantity to add it to the ticket.",
        addProduct: "Add Product",
        product: "Product",
        selectProduct: "Select Product",
        removeProduct: "Remove Product",
        qty: "Qty",
        unitPrice: "Unit Price",
        lineTotal: "Line Total",
        qtyHelper: "Use the arrows or type a number to match the quantity.",
        itemsEmpty: "Start by adding your first product to this order.",
        orderSummary: "Order Summary",
        itemsSubtotal: "Items Subtotal",
        amountPaid: "Amount Paid",
        balanceDue: "Balance Due",
        totalPaidHelper: "Record how much cash or card payment was collected.",
    },
} as const satisfies LanguageMessages;
