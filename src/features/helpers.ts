import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { CustomersTable } from "@/drizzle/schema";

type CustomerInput = {
    customerName: string;
    customerPhone: string;
    createdBy: string;
    totalSpent: number;
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;
};

export async function insertOrGetCustomer({
    customerName,
    customerPhone,
    createdBy,
    totalSpent,
    createdAt,
    updatedAt,
    updatedBy,
}: CustomerInput) {
    const existingCustomer = await db
        .select()
        .from(CustomersTable)
        .where(eq(CustomersTable.phone, customerPhone))
        .then((res) => res[0]);

    if (!existingCustomer) {
        const newCustomer = await db
            .insert(CustomersTable)
            .values({
                name: customerName,
                phone: customerPhone,
                createdBy,
                totalSpent,
                ...(createdAt ? { createdAt } : {}),
                ...(updatedAt ? { updatedAt } : {}),
                ...(updatedBy ? { updatedBy } : {}),
            })
            .returning()
            .then((res) => res[0]);

        return { exists: false, customer: newCustomer };
    } else {
        const customer = await db
            .update(CustomersTable)
            .set({
                totalSpent: existingCustomer.totalSpent + totalSpent,
                ...(updatedAt ? { updatedAt } : {}),
                ...(updatedBy ? { updatedBy } : {}),
            })
            .where(eq(CustomersTable.id, existingCustomer.id))
            .returning()
            .then((res) => res[0]);

        return { exists: true, customer };
    }
}
