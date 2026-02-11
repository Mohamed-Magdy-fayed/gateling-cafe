import type { Order } from "@/drizzle/schema";

// Minimal plain-text ESC/POS receipt formatter.
// Uses only fields from the provided `Order` object.

export function formatReceiptPlain(order: Order, shopName: string): string {
    const divider = "--------------------------------";

    const orderNumber = order.orderNumber ?? String(order.id ?? "");
    const date = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();

    const totalCents = typeof order.orderTotal === "number" ? order.orderTotal : 0;
    const total = (totalCents / 100).toFixed(2);

    const lines: string[] = [];
    lines.push(shopName);
    lines.push(divider);
    lines.push(`Order: ${orderNumber}`);
    lines.push(`Date:  ${date}`);
    lines.push(divider);
    lines.push(`Total: ${total}`);
    lines.push("");
    lines.push("Thank you!");

    // Append a common ESC/POS cut command (GS V 0) as raw bytes in the string.
    // When sending to QZ Tray later, we will send this string as raw data or convert properly.
    // GS V 0 -> \x1D\x56\x00
    lines.push("\x1D\x56\x00");

    return lines.join("\n");
}

// Example helper to produce a sample receipt string for preview/testing.
export function exampleReceiptString() {
    const sample: Order = {
        id: "sample-id",
        orderNumber: "ORD-2026-0001",
        status: "created",
        orderTotal: 1599,
        totalPaid: 0,
        customerName: "",
        customerPhone: "",
        employeeId: "",
        customerId: "",
        createdAt: new Date().toISOString(),
        createdBy: "system",
        updatedAt: null,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    } as unknown as Order;

    return formatReceiptPlain(sample, "");
}
