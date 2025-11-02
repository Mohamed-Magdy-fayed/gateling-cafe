import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";

export default async function HomePage() {
  const user = await getCurrentUser();
  console.log("user in page.tsx", user);

  if (!user) return redirect("/auth/sign-in");

  redirect("/dashboard");
}
