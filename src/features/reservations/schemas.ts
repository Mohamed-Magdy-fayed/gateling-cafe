import z from "zod";
import { reservationStatus } from "@/drizzle/schema";

export const reservationCreateSchema = z.object({
    reservationCode: z.string(),
    customerName: z.string(),
    customerPhone: z.string(),
    playtimeOptionId: z.string().min(1),
    totalPaid: z.number().optional().default(0),
    notes: z.string().optional(),
});
export type ReservationCreateValues = z.infer<typeof reservationCreateSchema>;

export const reservationUpdateSchema = z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    totalPaid: z.number().optional(),
    status: z.enum(reservationStatus).optional(),
    notes: z.string().optional(),
});
export type ReservationUpdateValues = z.infer<typeof reservationUpdateSchema>;

// UI schema (superset) to avoid any-casts in react-hook-form.
export const reservationFormSchema = z.object({
    reservationCode: z.string().optional(),
    customerName: z.string(),
    customerPhone: z.string(),
    playtimeOptionId: z.string().optional(),
    totalPaid: z.number().optional(),
    status: z.enum(reservationStatus).optional(),
    notes: z.string().optional(),
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
