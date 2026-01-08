import { db } from "@/drizzle";
import { KidsAreaCalloutPhrasesTable } from "@/drizzle/schema";
import { randomCreatedUpdated, SEED_ACTOR_EMAIL } from "./utils";

export async function seedKidsAreaCalloutPhrases() {
    const phrases = [
        "Attention please! Playtime starting soon.",
        "Welcome to Lavida Jungle Play!",
        "Please keep valuables with you at all times.",
        "Parents, please collect children on time.",
        "Remember to sanitize hands before entering.",
        "Shoes must be removed in the play area.",
        "Today’s special: free cookie with any juice.",
        "Please inform staff about allergies.",
        "Don't leave children unattended.",
        "Enjoy your time — have fun and be safe!",
    ];

    const inserted: Array<{ id: string; template: string }> = [];

    for (let i = 0; i < phrases.length; i++) {
        const template = phrases[i];
        const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });
        const row = await db
            .insert(KidsAreaCalloutPhrasesTable)
            .values({
                template,
                sortOrder: i,
                createdBy: "seed",
                updatedBy: SEED_ACTOR_EMAIL,
                createdAt,
                updatedAt,
            })
            .returning()
            .then((r) => r[0]);

        inserted.push({ id: row.id, template: row.template });
    }

    return inserted;
}
