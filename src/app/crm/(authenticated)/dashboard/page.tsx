import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FolderKanban, UserPlus, CheckSquare, TrendingUp, Calculator } from "lucide-react";
import prisma from "@/lib/prisma";

async function getDashboardStats() {
  const [clientCount, projectCount, leadCount, taskCount] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.lead.count(),
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
  ]);

  return { clientCount, projectCount, leadCount, taskCount };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">
          안녕하세요, {session?.user?.name}님! 오늘도 좋은 하루 되세요.
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

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 시스템 활동 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                아직 활동 내역이 없습니다.
              </p>
            </div>
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
