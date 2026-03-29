import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const menuRoutes = [
  { key: "dashboard", href: "/dashboard" },
  { key: "attendance", href: "/attendance" },
  { key: "clients", href: "/clients" },
  { key: "projects", href: "/projects" },
  { key: "servers", href: "/servers" },
  { key: "leads", href: "/leads" },
  { key: "obSales", href: "/ob-sales/my" },
  { key: "tasks", href: "/tasks/personal" },
  { key: "documents", href: "/documents/quotes" },
  { key: "accounts", href: "/accounts/my" },
  { key: "settlements", href: "/settlements/dashboard" },
  { key: "revenue", href: "/revenue/dashboard" },
  { key: "settings", href: "/settings/users" },
];

export default async function RootPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
    return;
  }

  try {
    const permissions = await prisma.userPermission.findUnique({
      where: { userId: session.user.id },
    });

    if (permissions) {
      const firstRoute = menuRoutes.find(
        (route) => permissions[route.key as keyof typeof permissions] === true
      );
      if (firstRoute) {
        redirect(firstRoute.href);
        return;
      }
    }
  } catch {
    // fallback
  }

  redirect("/dashboard");
}
