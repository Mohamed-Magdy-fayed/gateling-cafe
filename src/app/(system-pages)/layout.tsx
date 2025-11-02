import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { Header } from "@/components/general/header";

export default async function SystemPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCurrentUser({ redirectIfNotFound: true });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow p-4">{children}</main>
    </div>
  );
}
