"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  UserPlus,
  CheckSquare,
  FileText,
  KeyRound,
  Calculator,
  TrendingUp,
  Settings,
  ChevronDown,
  Wrench,
  Clock,
  Server,
  Menu,
  X,
  PhoneOutgoing,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type PermissionKey = "dashboard" | "attendance" | "clients" | "projects" | "leads" | "tasks" | "documents" | "accounts" | "servers" | "settlements" | "revenue" | "obSales" | "settings";

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: { title: string; href: string; adminOnly?: boolean }[];
  permissionKey?: PermissionKey;
}

const menuItems: MenuItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    permissionKey: "dashboard",
  },
  {
    title: "출근 / 퇴근",
    href: "/attendance",
    icon: <Clock className="h-5 w-5" />,
    permissionKey: "attendance",
  },
  {
    title: "거래처 관리",
    href: "/clients",
    icon: <Building2 className="h-5 w-5" />,
    permissionKey: "clients",
  },
  {
    title: "작업 프로젝트",
    href: "/projects",
    icon: <FolderKanban className="h-5 w-5" />,
    permissionKey: "projects",
  },
  {
    title: "오픈 프로젝트",
    href: "/projects/maintenance",
    icon: <Wrench className="h-5 w-5" />,
    permissionKey: "projects",
  },
  {
    title: "서버 리스트",
    href: "/servers",
    icon: <Server className="h-5 w-5" />,
    permissionKey: "servers",
  },
  {
    title: "가망고객",
    href: "/leads",
    icon: <UserPlus className="h-5 w-5" />,
    permissionKey: "leads",
  },
  {
    title: "OB영업",
    icon: <PhoneOutgoing className="h-5 w-5" />,
    permissionKey: "obSales",
    submenu: [
      { title: "DB 업로드", href: "/ob-sales/upload", adminOnly: true },
      { title: "DB 확인", href: "/ob-sales/my" },
      { title: "통화결과 대시보드", href: "/ob-sales/dashboard" },
    ],
  },
  {
    title: "업무관리",
    icon: <CheckSquare className="h-5 w-5" />,
    permissionKey: "tasks",
    submenu: [
      { title: "개인 업무", href: "/tasks/personal" },
      { title: "개인 캘린더", href: "/tasks/personal-calendar" },
      { title: "전체 업무", href: "/tasks/all" },
      { title: "전체 캘린더", href: "/tasks/all-calendar" },
    ],
  },
  {
    title: "문서관리",
    icon: <FileText className="h-5 w-5" />,
    permissionKey: "documents",
    submenu: [
      { title: "견적서 관리", href: "/documents/quotes" },
      { title: "프로젝트 파일", href: "/documents/project-files" },
      { title: "휴지통", href: "/documents/trash" },
    ],
  },
  {
    title: "계정 관리",
    icon: <KeyRound className="h-5 w-5" />,
    permissionKey: "accounts",
    submenu: [
      { title: "내 계정", href: "/accounts/my" },
      { title: "공유 계정", href: "/accounts/shared" },
    ],
  },
  {
    title: "정산 리포트",
    icon: <Calculator className="h-5 w-5" />,
    permissionKey: "settlements",
    submenu: [
      { title: "내 정산 대시보드", href: "/settlements/dashboard" },
      { title: "내 지급 현황", href: "/settlements/advances" },
      { title: "정산금 관리 (관리자)", href: "/settlements/manage", adminOnly: true },
      { title: "지급 관리 (관리자)", href: "/settlements/advances/manage", adminOnly: true },
    ],
  },
  {
    title: "매출 리포트",
    icon: <TrendingUp className="h-5 w-5" />,
    permissionKey: "revenue",
    submenu: [
      { title: "순익 대시보드", href: "/revenue/dashboard" },
      { title: "매출 관리", href: "/revenue/income" },
      { title: "매입 관리", href: "/revenue/expenses" },
    ],
  },
  {
    title: "설정",
    icon: <Settings className="h-5 w-5" />,
    permissionKey: "settings",
    submenu: [
      { title: "사용자/권한", href: "/settings/users" },
      { title: "출퇴근 관리", href: "/settings/attendance" },
      { title: "알림 설정", href: "/settings/notifications" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const permissions = session?.user?.permissions;
  const isAdmin = session?.user?.role === "ADMIN";

  const filteredMenuItems = menuItems.filter((item) => {
    if (isAdmin || !item.permissionKey) return true;
    if (!permissions) return true;
    return permissions[item.permissionKey];
  });

  // 현재 경로에 해당하는 서브메뉴 자동 열기
  useEffect(() => {
    const activeMenus = filteredMenuItems
      .filter((item) => item.submenu?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")))
      .map((item) => item.title);

    if (activeMenus.length > 0) {
      setOpenMenus((prev) => [...new Set([...prev, ...activeMenus])]);
    }
  }, [pathname]);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isSubmenuActive = (submenu: { title: string; href: string }[]) =>
    submenu.some((item) => pathname === item.href);

  const navContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">YA</span>
          </div>
          <span className="font-bold text-lg">와이에이솔루션</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => (
            <li key={item.title}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      item.submenu && isSubmenuActive(item.submenu)
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.title}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openMenus.includes(item.title) && "rotate-180"
                      )}
                    />
                  </button>
                  {item.submenu && openMenus.includes(item.title) && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {item.submenu.filter((sub) => !sub.adminOnly || isAdmin).map((subItem) => (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive(subItem.href)
                                ? "bg-primary text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-white shadow-md border"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 모바일 드로어 */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 border-r bg-white transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* PC 사이드바 */}
      <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        {navContent}
      </aside>
    </>
  );
}
