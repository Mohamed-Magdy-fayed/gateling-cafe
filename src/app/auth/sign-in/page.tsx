import Image from "next/image";
import { redirect } from "next/navigation";
import { SignInForm } from "@/auth/nextjs/components/sign-in-form";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function LoginPage() {
    const user = await getCurrentUser();
    if (user) redirect("/");

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <div className={cn("flex flex-col gap-6")}>
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <SignInForm />
                            <div className="bg-muted relative hidden md:block">
                                <Image
                                    height={1000}
                                    width={1000}
                                    src="/login_illustration.png"
                                    alt="Image"
                                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
