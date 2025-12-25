import { count } from "drizzle-orm";

import { db } from "@/drizzle";
import { KidsAreaCalloutPhrasesTable } from "@/drizzle/schema";

type SystemOptions = {
    actorEmail: string;
};

export async function seedKidsAreaCalloutPhrasesSystem(_opts: SystemOptions) {
    const existingCount = await db
        .select({ value: count() })
        .from(KidsAreaCalloutPhrasesTable)
        .then((r) => r[0]?.value ?? 0);

    if (existingCount > 0) return;

    const phrases = [
        "يرجى التوجه للاستقبال. شكراً لتعاونكم.",
        "لو سمحتم، ولي أمر الطفل {name} يتوجه لمنطقة الألعاب.",
        "تنبيه: وقت اللعب للطفل {name} انتهى. يرجى الاستلام من Lavida Jungle Play.",
        "برجاء الانتباه: سيتم إغلاق منطقة الألعاب بعد قليل.",
        "لو سمحتم، برجاء الحفاظ على الهدوء داخل منطقة Lavida Jungle Play.",
        "Thank you for visiting Lavida Jungle Play.",
        "Attention please: {name} is ready to be picked up from Lavida Jungle Play.",
        "Please proceed to the kids area reception.",
    ];

    await db.insert(KidsAreaCalloutPhrasesTable).values(
        phrases.map((template, sortOrder) => ({
            template,
            sortOrder,
            createdBy: "seed",
            updatedBy: "seed",
        })),
    );
}
