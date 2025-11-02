import type { mainTranslations } from "@/lib/i18n/global";
import type { TFunction } from "@/lib/i18n/lib";
import type { signIn } from "@/auth/nextjs/actions";
import { toast } from "sonner";

export function showAuthToast(error: Awaited<ReturnType<typeof signIn>>, t: TFunction<typeof mainTranslations>) {
    switch (error) {
        case "Bad request":
            toast.error(t("auth.error.badRequest"))
            break;
        case "No user":
            toast.error(t("auth.error.noUser"))
            break;
        case "No password":
            toast.error(t("auth.error.noPassword"))
            break;
        case "Credentials":
            toast.error(t("auth.error.credentials"))
            break;
        default:
            toast.success(t("auth.signIn.success"))
            return;
    }
}