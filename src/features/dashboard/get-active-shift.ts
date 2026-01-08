import { and, isNull } from "drizzle-orm";

import { db } from "@/drizzle";
import {
    type DailyCashClosure,
    DailyCashClosuresTable,
} from "@/drizzle/schema";

export async function getActiveShift(): Promise<DailyCashClosure | null> {
    return db.query.DailyCashClosuresTable.findFirst({
        where: and(
            isNull(DailyCashClosuresTable.closedAt),
            isNull(DailyCashClosuresTable.deletedAt),
        ),
    }).then((shift) => shift || null);
}
