import { SignInForm } from "@/auth/nextjs/components/sign-in-form";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { FooterCopywrite } from "@/components/general/copywrite";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function LoginPage() {
    const user = await getCurrentUser();
    if (user) redirect("/");

    return (
        <div className="bg-gradient-to-br from-background to-muted min-h-svh flex flex-col items-center">
            <div className="fixed inset-0 z-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="w-full max-w-sm md:max-w-3xl flex-1 grid place-content-center">
                <div className={cn("flex flex-col gap-6")}>
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <SignInForm />
                            <div className="bg-muted relative hidden md:block">
                                <img
                                    src="/placeholder.svg"
                                    alt="Image"
                                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="mt-auto max-w-7xl">
                <FooterCopywrite />
            </div>
        </div>
    )
}
