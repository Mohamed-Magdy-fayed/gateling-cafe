"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { mainTranslations } from "@/lib/i18n/global";
import {
    createI18n,
    type LanguageMessages,
    LOCALE_COOKIE_NAME,
} from "@/lib/i18n/lib";

export async function setLocaleCookie(locale: string) {
    (await cookies()).set(LOCALE_COOKIE_NAME, locale, {
        path: "/", // Make the cookie available on all pages
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
    });

    // Optional: Revalidate the current path to re-render Server Components
    // with the new locale. This is useful if you want the page to
    // immediately reflect the change without a full reload.
    revalidatePath("/");
}

export async function getLocaleCookie() {
    const cookie = (await cookies()).get(LOCALE_COOKIE_NAME);
    return cookie?.value || "en";
}

/**
 * A server-side helper to get a fully-typed `t` function.
 * Does not use React hooks.
 *
 * @param translations The translations object for this specific context.
 * @returns A fully-typed `t` function.
 */
export async function getT<const T extends Record<string, LanguageMessages>>(
    translations?: T,
) {
    const locale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value || "en";
    return {
        ...createI18n(translations || mainTranslations, locale, "en"),
        locale,
    };
}
