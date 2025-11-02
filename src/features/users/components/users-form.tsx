"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { SelectField } from "@/components/general/select-field";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SheetFooter } from "@/components/ui/sheet";
import { type User, userScreens } from "@/drizzle/schema";
import { createUser, editUsers } from "@/features/users/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

export const userFormSchema = z.object({
    name: z.string().min(3),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["admin", "user"]),
    screens: z.array(z.enum(userScreens)),
    phone: z.string().min(10).max(15).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export function UsersForm({ user, setIsOpen }: { user?: User, setIsOpen: (isOpen: boolean) => void }) {
    const { t } = useTranslation();
    const router = useRouter();

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            role: user?.role || "user",
            screens: user?.screens || ["users"],
            phone: user?.phone || "",
        },
    });

    async function handleSubmit(data: UserFormValues) {
        let resultUser: { error: boolean; message?: string, data?: User | undefined };

        if (!user) {
            resultUser = await createUser(data);
        } else {
            resultUser = await editUsers({ ids: [user?.id], ...data });
        }

        if (resultUser.error) {
            toast.error(t("error", { error: resultUser.message }));
        } else {
            toast.success(t("success"));
            router.refresh();
            setIsOpen(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <SheetFooter>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("forms.name")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("forms.namePlaceholder")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("auth.email")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("auth.emailPlaceholder")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {!user && (
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("auth.password")}</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            placeholder={t("auth.passwordPlaceholder")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("usersTranslations.phone")}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("usersTranslations.phone")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={"screens"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("usersTranslations.screens")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        multiple
                                        options={userScreens.map((screen) => ({
                                            value: screen,
                                            label: t(`usersTranslations.screenNames.${screen}`),
                                        }))}
                                        title={t("usersTranslations.screens")}
                                        values={field.value ?? []}
                                        setValues={(values) => field.onChange(values)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center justify-between gap-4">
                        <Button
                            disabled={!form.formState.isValid || form.formState.isSubmitting}
                            className="flex-1"
                        >
                            <SaveIcon />
                            {t("common.save")}
                        </Button>
                        <Button type="button" variant="destructive">
                            {t("common.cancel")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
