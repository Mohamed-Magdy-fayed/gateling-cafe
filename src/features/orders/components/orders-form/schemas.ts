import z from "zod";
import { orderStatuses } from "@/drizzle/schema";

export const orderProductSchema = z.object({
    productId: z.string().min(1),
    qty: z.number().min(1),
    unitPriceCents: z.number().min(0),
    lineTotalCents: z.number().min(0),
});

export const orderFormSchema = z.object({
    orderNumber: z.string().min(1),
    status: z.enum(orderStatuses),
    orderTotal: z.number().min(0),
    totalPaid: z.number().min(0),
    customerName: z.string().min(1),
    customerPhone: z.string().min(1),
    items: z.array(orderProductSchema).min(1),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const createEmptyItem = (): OrderFormValues["items"][number] => ({
    productId: "",
    qty: 1,
    unitPriceCents: 0,
    lineTotalCents: 0,
});
