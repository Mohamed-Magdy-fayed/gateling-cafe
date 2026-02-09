"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogInIcon } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { changePassword } from "@/auth/nextjs/actions";
import { SpinnerButton } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export function ChangePasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  async function onSubmit({
    currentPassword,
    newPassword,
  }: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const error = await changePassword({ currentPassword, newPassword });

      if (error) {
        toast.error(error);
      } else {
        toast.success(t("auth.changePasswordSuccess"));
      }
    });
  }

  return (
    <Form {...form}>
      <form
        className={cn("p-6 md:p-8", className)}
        {...props}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-6 items-stretch">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">{t("auth.changePassword")}</h1>
          </div>
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.currentPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder={t("auth.currentPasswordPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
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
          <SpinnerButton
            type="submit"
            icon={LogInIcon}
            isLoading={isPending}
            disabled={isPending}
            className="w-full"
            text={t("auth.changePassword")}
          />
        </div>
      </form>
    </Form>
  );
}
