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
} from "lucide-react";
import { useState, useEffect } from "react";

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: { title: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "대시보드",
    href: "/crm/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "출근 / 퇴근",
    href: "/crm/attendance",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    title: "거래처 관리",
    href: "/crm/clients",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "작업 프로젝트",
    href: "/crm/projects",
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    title: "오픈 프로젝트",
    href: "/crm/projects/maintenance",
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    title: "서버 리스트",
    href: "/crm/servers",
    icon: <Server className="h-5 w-5" />,
  },
  {
    title: "가망고객",
    href: "/crm/leads",
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    title: "업무관리",
    icon: <CheckSquare className="h-5 w-5" />,
    submenu: [
      { title: "개인 업무", href: "/crm/tasks/personal" },
      { title: "개인 캘린더", href: "/crm/tasks/personal-calendar" },
      { title: "전체 업무", href: "/crm/tasks/all" },
      { title: "전체 캘린더", href: "/crm/tasks/all-calendar" },
    ],
  },
  {
    title: "문서관리",
    icon: <FileText className="h-5 w-5" />,
    submenu: [
      { title: "견적서 관리", href: "/crm/documents/quotes" },
      { title: "프로젝트 파일", href: "/crm/documents/project-files" },
      { title: "휴지통", href: "/crm/documents/trash" },
    ],
  },
  {
    title: "계정 관리",
    icon: <KeyRound className="h-5 w-5" />,
    submenu: [
      { title: "내 계정", href: "/crm/accounts/my" },
      { title: "공유 계정", href: "/crm/accounts/shared" },
    ],
  },
  {
    title: "정산 리포트",
    icon: <Calculator className="h-5 w-5" />,
    submenu: [
      { title: "내 정산 대시보드", href: "/crm/settlements/dashboard" },
      { title: "정산금 관리", href: "/crm/settlements/manage" },
    ],
  },
  {
    title: "매출 리포트",
    icon: <TrendingUp className="h-5 w-5" />,
    submenu: [
      { title: "순익 대시보드", href: "/crm/revenue/dashboard" },
      { title: "매출 관리", href: "/crm/revenue/income" },
      { title: "매입 관리", href: "/crm/revenue/expenses" },
    ],
  },
  {
    title: "설정",
    icon: <Settings className="h-5 w-5" />,
    submenu: [
      { title: "사용자/권한", href: "/crm/settings/users" },
      { title: "출퇴근 관리", href: "/crm/settings/attendance" },
      { title: "알림 설정", href: "/crm/settings/notifications" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // 현재 경로에 해당하는 서브메뉴 자동 열기
  useEffect(() => {
    const activeMenus = menuItems
      .filter((item) => item.submenu?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")))
      .map((item) => item.title);

    if (activeMenus.length > 0) {
      setOpenMenus((prev) => [...new Set([...prev, ...activeMenus])]);
    }
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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/crm/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">YA</span>
          </div>
          <span className="font-bold text-lg">와이에이솔루션</span>
        </Link>
      </div>
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
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
                      {item.submenu.map((subItem) => (
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
    </aside>
  );
}
