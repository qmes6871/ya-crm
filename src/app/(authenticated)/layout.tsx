import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DemoBanner } from "@/components/layout/demo-banner";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isDemo = session.user?.email === "demo@yasolution.com";

  return (
    <div className="min-h-screen bg-gray-50">
      {isDemo && <DemoBanner />}
      <Sidebar />
      <div className={isDemo ? "lg:ml-64 pt-[56px]" : "lg:ml-64"}>
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
