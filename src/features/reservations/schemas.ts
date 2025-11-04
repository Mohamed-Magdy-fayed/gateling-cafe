import z from "zod";
import { reservationStatus } from "@/drizzle/schema";

export const reservationFormSchema = z.object({
    reservationCode: z.string(),
    customerName: z.string(),
    customerPhone: z.string(),
    totalPrice: z.number(),
    totalPaid: z.number(),
    startTime: z.date(),
    endTime: z.date(),
    status: z.enum(reservationStatus),
    notes: z.string().optional(),
});
export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
