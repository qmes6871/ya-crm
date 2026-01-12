import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FolderKanban, UserPlus, CheckSquare, Calculator, Clock, AlertTriangle } from "lucide-react";
import prisma from "@/lib/prisma";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { DashboardAttendance } from "@/components/dashboard/DashboardAttendance";

async function getDashboardStats() {
  const [clientCount, projectCount, leadCount, taskCount] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.lead.count(),
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
  ]);

  return { clientCount, projectCount, leadCount, taskCount };
}

async function getUpcomingDeadlineProjects() {
  const now = new Date();

  return prisma.project.findMany({
    where: {
      deadline: { not: null },
      status: { not: "COMPLETED" },
    },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
    orderBy: { deadline: "asc" },
    take: 5,
  });
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

function getGivenName(fullName: string | null | undefined): string {
  if (!fullName) return "사용자";
  // Korean names: first character is surname, rest is given name
  // e.g., "신동훈" -> "동훈"
  if (fullName.length > 1) {
    return fullName.slice(1);
  }
  return fullName;
}

export default async function DashboardPage() {
  const session = await auth();
  const [stats, upcomingProjects] = await Promise.all([
    getDashboardStats(),
    getUpcomingDeadlineProjects(),
  ]);
  const givenName = getGivenName(session?.user?.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">
          안녕하세요, {givenName}님! 오늘도 좋은 하루 되세요.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거래처</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientCount}</div>
            <p className="text-xs text-muted-foreground">
              등록된 거래처 수
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">프로젝트</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectCount}</div>
            <p className="text-xs text-muted-foreground">
              진행중인 프로젝트
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">가망고객</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadCount}</div>
            <p className="text-xs text-muted-foreground">
              등록된 가망고객
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진행중 업무</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taskCount}</div>
            <p className="text-xs text-muted-foreground">
              미완료 업무
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance, Upcoming Deadlines & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 출퇴근 */}
        <DashboardAttendance />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              마감일 임박 프로젝트
            </CardTitle>
            <CardDescription>마감일이 가까운 프로젝트</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                마감일이 설정된 프로젝트가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingProjects.map((project) => {
                  const daysLeft = project.deadline
                    ? differenceInDays(new Date(project.deadline), new Date())
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

                  return (
                    <Link
                      key={project.id}
                      href={`/crm/projects/${project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{project.name}</p>
                          {isOverdue && (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {project.client.name} · {project.manager.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge className={statusLabels[project.status]?.color || ""}>
                          {statusLabels[project.status]?.label}
                        </Badge>
                        {project.deadline && (
                          <span
                            className={`text-xs font-medium ${
                              isOverdue
                                ? "text-red-600"
                                : isUrgent
                                ? "text-orange-600"
                                : "text-gray-500"
                            }`}
                          >
                            {isOverdue
                              ? `${Math.abs(daysLeft!)}일 지남`
                              : daysLeft === 0
                              ? "오늘 마감"
                              : `${daysLeft}일 남음`}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 사용하는 기능</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/crm/clients/new"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">거래처 추가</span>
              </a>
              <a
                href="/crm/leads/new"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">가망고객 추가</span>
              </a>
              <a
                href="/crm/tasks/personal"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <CheckSquare className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">업무 관리</span>
              </a>
              <a
                href="/crm/documents/quotes/new"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Calculator className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">견적서 작성</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
