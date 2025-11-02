"use client"

import { SpinnerButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogInIcon } from "lucide-react"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { signIn } from "@/auth/nextjs/actions"
import { showAuthToast } from "@/auth/nextjs/lib"

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

type PendingAction = "idle" | "credentials" | "google";

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<PendingAction>("idle");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit({ email, password }: z.infer<typeof formSchema>) {
    startTransition(async () => {
      setPendingAction("credentials");

      const error = await signIn({ email, password });

      showAuthToast(error, t)

      setPendingAction("idle");
    })
  }

  const isAnyActionPending = pendingAction !== "idle";

  return (
    <Form {...form}>
      <form className={cn("p-6 md:p-8", className)} {...props} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 items-stretch">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">{t("auth.signIn.title")}</h1>
            <p className="text-muted-foreground text-balance">
              {t("auth.signIn.description")}
            </p>
          </div>
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.password")}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t("auth.passwordPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SpinnerButton
            type="submit"
            icon={LogInIcon}
            isLoading={pendingAction === "credentials" && isPending}
            disabled={isAnyActionPending}
            className="w-full"
            text={t("system.userMenu.login")}
          />
        </div>
      </form>
    </Form>
  )
}

