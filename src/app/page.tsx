import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";

export default async function HomePage() {
  await getCurrentUser({ redirectIfNotFound: true });
  redirect("/dashboard");
}
