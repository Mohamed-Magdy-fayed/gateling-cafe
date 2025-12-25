import { eq, isNull } from "drizzle-orm";

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

import { seedKidsAreaCalloutPhrasesSystem } from "@/features/kids-area-callouts/system";
import { createOrderSystem } from "@/features/orders/system";
import { ensureProductsSystem } from "@/features/products/system";
import {
    createReservationSystem,
    ensurePlaytimeOptionsSystem,
} from "@/features/reservations/system";
import { ensureUserSystem } from "@/features/users/system";

const ADMIN_EMAIL = "admin@email.com";
const ADMIN_PASSWORD = "Pass@word1";
const ADMIN_NAME = "Admin";

const SEED_ACTOR_EMAIL = "seed@system.local";

function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Cannot pick from empty array");
    const value = arr[Math.floor(Math.random() * arr.length)];
    if (value === undefined) throw new Error("Failed to pick value");
    return value;
}

function randomDateBetween(from: Date, to: Date) {
    const start = from.getTime();
    const end = to.getTime();
    if (end <= start) return new Date(start);
    const ts = start + Math.floor(Math.random() * (end - start));
    return new Date(ts);
}

function buildEgyptianPhone(index: number) {
    // Simple deterministic-ish Egyptian mobile format: 01XYYYYYYYY
    const prefixes = ["010", "011", "012", "015"] as const;
    const prefix = prefixes[index % prefixes.length] ?? "010";
    const body = String(10000000 + (index % 90000000)).padStart(8, "0");
    return `${prefix}${body}`;
}

export async function seedAdminUser() {
    await ensureUserSystem(
        {
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            password: ADMIN_PASSWORD,
            role: "admin",
            screens: ["dashboard", "users", "products", "orders", "reservations", "playground"],
        },
        { actorEmail: SEED_ACTOR_EMAIL },
    );
}

export async function seedPlaytimeOptions() {
    await ensurePlaytimeOptionsSystem(
        [
            { name: "30 minutes", durationMinutes: 30, price: 30 },
            { name: "60 minutes", durationMinutes: 60, price: 50 },
            { name: "90 minutes", durationMinutes: 90, price: 70 },
            { name: "120 minutes", durationMinutes: 120, price: 90 },
        ],
        { actorEmail: SEED_ACTOR_EMAIL },
    );
}

async function seedPlaygroundUsers() {
    const employees = [
        { name: "Ahmed Hassan", email: "ahmed.hassan@lavida.local" },
        { name: "Mohamed Ali", email: "mohamed.ali@lavida.local" },
        { name: "Omar Saeed", email: "omar.saeed@lavida.local" },
        { name: "Youssef Ibrahim", email: "youssef.ibrahim@lavida.local" },
        { name: "Sara Mahmoud", email: "sara.mahmoud@lavida.local" },
        { name: "Mona Abdelrahman", email: "mona.abdelrahman@lavida.local" },
        { name: "Nour El Din", email: "nour.eldin@lavida.local" },
        { name: "Hany Adel", email: "hany.adel@lavida.local" },
    ] as const;

    const created = await Promise.all(
        employees.map((e) =>
            ensureUserSystem(
                {
                    email: e.email,
                    name: e.name,
                    password: "Pass@word1",
                    role: "user",
                    screens: ["dashboard", "reservations", "playground"],
                },
                { actorEmail: SEED_ACTOR_EMAIL },
            ),
        ),
    );

    return created.map((u) => ({ id: u.id, email: u.email }));
}

async function seedCafeUsers() {
    const employees = [
        { name: "Mahmoud Said", email: "mahmoud.said@cafe.local" },
        { name: "Mostafa Gamal", email: "mostafa.gamal@cafe.local" },
        { name: "Heba Hassan", email: "heba.hassan@cafe.local" },
        { name: "Aya Mohamed", email: "aya.mohamed@cafe.local" },
    ] as const;

    const created = await Promise.all(
        employees.map((e) =>
            ensureUserSystem(
                {
                    email: e.email,
                    name: e.name,
                    password: "Pass@word1",
                    role: "user",
                    screens: ["dashboard", "orders", "products"],
                },
                { actorEmail: SEED_ACTOR_EMAIL },
            ),
        ),
    );

    return created.map((u) => ({ id: u.id, email: u.email }));
}

export async function seedCafeData() {
    const cafeEmployees = await seedCafeUsers();

    const products = await ensureProductsSystem(
        [
            { name: "قهوة تركي", priceCents: 2000 },
            { name: "قهوة فرنساوي", priceCents: 2800 },
            { name: "إسبريسو", priceCents: 2500 },
            { name: "كابتشينو", priceCents: 3500 },
            { name: "لاتيه", priceCents: 3800 },
            { name: "شاي", priceCents: 1500 },
            { name: "كركديه", priceCents: 1800 },
            { name: "عصير مانجو", priceCents: 3200 },
            { name: "عصير فراولة", priceCents: 3200 },
            { name: "ليمون بالنعناع", priceCents: 3000 },
            { name: "موهيتو نعناع", priceCents: 3500 },
            { name: "وافل نوتيلا", priceCents: 4500 },
            { name: "كريب نوتيلا", priceCents: 4200 },
            { name: "ساندوتش جبنة", priceCents: 3000 },
        ],
        { actorEmail: SEED_ACTOR_EMAIL },
    );

    const firstNames = [
        "Ahmed",
        "Mohamed",
        "Mahmoud",
        "Omar",
        "Youssef",
        "Hassan",
        "Mostafa",
        "Karim",
        "Heba",
        "Aya",
        "Mona",
        "Salma",
        "Nour",
        "Fatma",
    ] as const;
    const lastNames = [
        "Hassan",
        "Mahmoud",
        "Ibrahim",
        "Saeed",
        "Ali",
        "Gamal",
        "Khaled",
        "Abdelrahman",
        "Fawzy",
        "Eid",
    ] as const;

    const orderCount = 220;
    for (let i = 0; i < orderCount; i++) {
        const employee = pick(cafeEmployees);

        const statusRoll = Math.random();
        const status =
            statusRoll < 0.7
                ? "completed"
                : statusRoll < 0.85
                    ? "created"
                    : statusRoll < 0.95
                        ? "preparing"
                        : "cancelled";

        const customerName = `${pick(firstNames)} ${pick(lastNames)}`;
        const customerPhone = buildEgyptianPhone(10_000 + i);

        const itemCount = 1 + Math.floor(Math.random() * 4);
        const pickedProducts = new Map<string, { id: string; qty: number }>();
        while (pickedProducts.size < itemCount) {
            const p = pick(products);
            if (!pickedProducts.has(p.id)) {
                pickedProducts.set(p.id, { id: p.id, qty: 1 + Math.floor(Math.random() * 3) });
            }
        }

        await createOrderSystem(
            {
                orderNumber: `ORD-SEED-${String(i + 1).padStart(5, "0")}`,
                status,
                items: Array.from(pickedProducts.values()).map((p) => ({
                    productId: p.id,
                    qty: p.qty,
                })),
                totalPaid: status === "cancelled" ? 0 : 999999, // capped by system function
                customerName,
                customerPhone,
                employeeId: employee.id,
            },
            { actorEmail: employee.email },
        );
    }
}

export async function seedPlaygroundData() {
    await seedKidsAreaCalloutPhrasesSystem({ actorEmail: SEED_ACTOR_EMAIL });
    const employees = await seedPlaygroundUsers();

    const playtimeOptions = await db
        .select({
            id: PlaytimeOptionsTable.id,
            durationMinutes: PlaytimeOptionsTable.durationMinutes,
            price: PlaytimeOptionsTable.price,
        })
        .from(PlaytimeOptionsTable)
        .where(isNull(PlaytimeOptionsTable.deletedAt));

    if (playtimeOptions.length === 0) {
        throw new Error("No playtime options available for seeding reservations.");
    }

    const kidNamesAr = [
        "يوسف",
        "عمر",
        "آدم",
        "سيف",
        "حمزة",
        "حسن",
        "علي",
        "مروان",
        "كريم",
        "مريم",
        "سارة",
        "ملك",
        "ياسمين",
        "نور",
        "فريدة",
        "ليلى",
        "زين",
        "يحيى",
        "سليم",
        "نادين",
    ] as const;

    const reservationCount = 160;
    const now = new Date();

    for (let i = 0; i < reservationCount; i++) {
        const employee = pick(employees);
        const option = pick(playtimeOptions);
        const kidName = pick(kidNamesAr);
        const phone = buildEgyptianPhone(i + 1);

        const statusRoll = Math.random();
        const status =
            statusRoll < 0.75
                ? "ended"
                : statusRoll < 0.9
                    ? "cancelled"
                    : "started";
        const totalPaid = status === "cancelled" ? 0 : option.price;

        const startTime = new Date(now.getTime() - (Math.floor(Math.random() * 9) * 60 + Math.floor(Math.random() * 60)) * 60_000);
        const endTime = new Date(startTime.getTime() + option.durationMinutes * 60_000);

        await createReservationSystem(
            {
                reservationCode: `RES-SEED-${String(i + 1).padStart(5, "0")}`,
                customerName: kidName,
                customerPhone: phone,
                playtimeOptionId: option.id,
                totalPaid,
                notes: "Lavida Jungle Play",
                status,
                startTime,
                endTime,
                employeeId: employee.id,
            },
            { actorEmail: employee.email },
        );
    }
}

async function randomizeSeededTableTimestamps(
    selectIds: () => Promise<Array<{ id: string }>>,
    updateRow: (id: string, createdAt: Date, updatedAt: Date) => Promise<void>,
    yearsBack: number,
) {
    const rows = await selectIds();
    if (rows.length === 0) return;

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - yearsBack);

    for (const row of rows) {
        const createdAt = randomDateBetween(from, now);
        const updatedAt = randomDateBetween(createdAt, now);
        await updateRow(row.id, createdAt, updatedAt);
    }
}

export async function randomizeSeededTimestamps({ yearsBack = 2 } = {}) {
    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: UsersTable.id })
                .from(UsersTable)
                .where(eq(UsersTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(UsersTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(UsersTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: CustomersTable.id })
                .from(CustomersTable)
                .where(eq(CustomersTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(CustomersTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(CustomersTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: PlaytimeOptionsTable.id })
                .from(PlaytimeOptionsTable)
                .where(eq(PlaytimeOptionsTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(PlaytimeOptionsTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(PlaytimeOptionsTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: ReservationsTable.id })
                .from(ReservationsTable)
                .where(eq(ReservationsTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(ReservationsTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(ReservationsTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: ProductsTable.id })
                .from(ProductsTable)
                .where(eq(ProductsTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(ProductsTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(ProductsTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: OrdersTable.id })
                .from(OrdersTable)
                .where(eq(OrdersTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(OrdersTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(OrdersTable.id, id));
        },
        yearsBack,
    );

    await randomizeSeededTableTimestamps(
        async () =>
            db
                .select({ id: KidsAreaCalloutPhrasesTable.id })
                .from(KidsAreaCalloutPhrasesTable)
                .where(eq(KidsAreaCalloutPhrasesTable.createdBy, "seed")),
        async (id, createdAt, updatedAt) => {
            await db
                .update(KidsAreaCalloutPhrasesTable)
                .set({ createdAt, updatedAt, updatedBy: SEED_ACTOR_EMAIL })
                .where(eq(KidsAreaCalloutPhrasesTable.id, id));
        },
        yearsBack,
    );
}

export async function seedAll() {
    await seedAdminUser();
    await seedPlaytimeOptions();
    await seedCafeData();
    await seedPlaygroundData();
    await randomizeSeededTimestamps({ yearsBack: 2 });
}

export async function seed() {
    await seedAll();
}
