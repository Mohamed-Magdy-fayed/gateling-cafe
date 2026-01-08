import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
    CustomersTable,
    KidsAreaCalloutPhrasesTable,
    OrdersTable,
    ProductsTable,
    ReservationsTable,
    UsersTable,
} from "@/drizzle/schema";
import { PlaytimeOptionsTable } from "@/drizzle/schemas/kids/playtime-options-table";
import { seedKidsAreaCalloutPhrases } from "./callouts";
import { seedOrders } from "./orders";
import { seedPlaytimeOptions } from "./playtime";
import { seedProducts } from "./products";
import { seedReservations } from "./reservations";
import { seedAdminUser, seedCafeUsers, seedPlaygroundUsers } from "./users";

async function clearSeededData() {
    // delete in order that avoids FK constraint issues
    try {
        await db
            .delete(ReservationsTable)
            .where(eq(ReservationsTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db.delete(OrdersTable).where(eq(OrdersTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db.delete(CustomersTable).where(eq(CustomersTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db.delete(ProductsTable).where(eq(ProductsTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db
            .delete(PlaytimeOptionsTable)
            .where(eq(PlaytimeOptionsTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db
            .delete(KidsAreaCalloutPhrasesTable)
            .where(eq(KidsAreaCalloutPhrasesTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }

    try {
        await db.delete(UsersTable).where(eq(UsersTable.createdBy, "seed"));
    } catch (e) {
        // ignore
    }
}

export async function seedAll({
    yearsBack = 2,
    minPerDay = 10,
    maxPerDay = 30,
} = {}) {
    // clear previous seeded data
    await clearSeededData();

    // users
    await seedAdminUser();
    await seedPlaygroundUsers();
    await seedCafeUsers();

    // products and playtime options
    await seedProducts();
    await seedPlaytimeOptions();
    await seedKidsAreaCalloutPhrases();

    // orders and reservations (these create customers as part of their flow)
    await seedOrders({ yearsBack, minPerDay, maxPerDay });
    await seedReservations({ yearsBack, minPerDay, maxPerDay });
}

export async function seed() {
    await seedAll({ yearsBack: 2, minPerDay: 10, maxPerDay: 30 });
}

export async function seedAdmin() {
    // await clearSeededData();
    // await seedAdminUser();
    await seedPlaytimeOptions();
}
