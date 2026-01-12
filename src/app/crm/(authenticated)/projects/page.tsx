import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderKanban, Eye } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ProjectFilters } from "@/components/project/ProjectFilters";
import { Suspense } from "react";

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

interface SearchParams {
  manager?: string;
  client?: string;
  status?: string;
  amount?: string;
  date?: string;
}

function getDateFilter(dateParam: string | undefined) {
  if (!dateParam || dateParam === "all") return undefined;

  const now = new Date();

  switch (dateParam) {
    case "today":
      return { gte: startOfDay(now) };
    case "week":
      return { gte: startOfWeek(now, { locale: ko }) };
    case "month":
      return { gte: startOfMonth(now) };
    case "quarter":
      return { gte: subMonths(now, 3) };
    case "year":
      return { gte: startOfYear(now) };
    default:
      return undefined;
  }
}

function getAmountRange(amountParam: string | undefined): { min: number; max: number } | null {
  if (!amountParam || amountParam === "all") return null;

  switch (amountParam) {
    case "0-100":
      return { min: 0, max: 1000000 };
    case "100-500":
      return { min: 1000000, max: 5000000 };
    case "500-1000":
      return { min: 5000000, max: 10000000 };
    case "1000-5000":
      return { min: 10000000, max: 50000000 };
    case "5000+":
      return { min: 50000000, max: Number.MAX_SAFE_INTEGER };
    default:
      return null;
  }
}

async function getProjects(searchParams: SearchParams) {
  const dateFilter = getDateFilter(searchParams.date);

  const where: Record<string, unknown> = {
    status: { notIn: ["COMPLETED", "OPEN"] },
  };

  if (searchParams.manager && searchParams.manager !== "all") {
    where.managerId = searchParams.manager;
  }

  if (searchParams.client && searchParams.client !== "all") {
    where.clientId = searchParams.client;
  }

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status;
  }

  if (dateFilter) {
    where.deadline = dateFilter;
  }

  return prisma.project.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true },
      },
      manager: {
        select: { id: true, name: true },
      },
      payments: true,
    },
    orderBy: { deadline: "asc" },
  });
}

async function getManagers() {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getClients() {
  return prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [projects, managers, clients] = await Promise.all([
    getProjects(params),
    getManagers(),
    getClients(),
  ]);

  // Calculate total amount for each project from payments
  const projectsWithTotals = projects.map((project) => {
    const totalAmount = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return { ...project, totalAmount };
  });

  // Filter by amount if specified
  const amountRange = getAmountRange(params.amount);
  const filteredProjects = amountRange
    ? projectsWithTotals.filter(
        (p) => p.totalAmount >= amountRange.min && p.totalAmount < amountRange.max
      )
    : projectsWithTotals;

  // Calculate grand total and totals by payment type
  const grandTotal = filteredProjects.reduce((sum, project) => sum + project.totalAmount, 0);

  // Calculate totals by payment type
  const paymentTotals = filteredProjects.reduce(
    (acc, project) => {
      project.payments.forEach((payment) => {
        switch (payment.type) {
          case "ADVANCE":
            acc.advance += payment.amount;
            break;
          case "MID_PAYMENT":
            acc.midPayment += payment.amount;
            break;
          case "BALANCE":
            acc.balance += payment.amount;
            break;
          case "FULL_PAYMENT":
            acc.fullPayment += payment.amount;
            break;
        }
      });
      return acc;
    },
    { advance: 0, midPayment: 0, balance: 0, fullPayment: 0 }
  );

  // Count active filters
  const activeFilterCount = [
    params.manager,
    params.client,
    params.status,
    params.amount,
    params.date,
  ].filter((v) => v && v !== "all").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
          <p className="text-gray-500">프로젝트를 관리합니다.</p>
        </div>
        <Link href="/crm/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            프로젝트 생성
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg" />}>
        <ProjectFilters managers={managers} clients={clients} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            프로젝트 목록
          </CardTitle>
          <CardDescription>
            총 {filteredProjects.length}개의 프로젝트
            {activeFilterCount > 0 && (
              <span className="ml-2 text-blue-600">
                (필터 {activeFilterCount}개 적용됨)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {activeFilterCount > 0
                  ? "필터 조건에 맞는 프로젝트가 없습니다"
                  : "등록된 프로젝트가 없습니다"}
              </h3>
              <p className="mt-2 text-gray-500">
                {activeFilterCount > 0
                  ? "다른 필터 조건을 선택해보세요."
                  : "새로운 프로젝트를 생성해보세요."}
              </p>
              {activeFilterCount === 0 && (
                <Link href="/crm/projects/new" className="mt-4 inline-block">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    프로젝트 생성
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트명</TableHead>
                  <TableHead>거래처</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>진행률</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-center">마감일</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/crm/projects/${project.id}`}
                        className="hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/crm/clients/${project.client.id}`}
                        className="hover:underline"
                      >
                        {project.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{project.manager.name}</TableCell>
                    <TableCell>
                      <Badge className={statusLabels[project.status].color}>
                        {statusLabels[project.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="w-20" />
                        <span className="text-sm text-gray-500">
                          {project.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {project.totalAmount > 0 ? formatCurrency(project.totalAmount) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {project.deadline ? (
                        <span className={new Date(project.deadline) < new Date() ? "text-red-600 font-medium" : ""}>
                          {format(new Date(project.deadline), "yyyy.MM.dd", { locale: ko })}
                        </span>
                      ) : (
                        <span className="text-gray-400">미설정</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          자세히 보기
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={5} className="text-sm text-gray-600">
                    <div className="flex flex-wrap gap-4">
                      <span>선수금: <span className="font-medium">{formatCurrency(paymentTotals.advance)}</span></span>
                      <span>중도금: <span className="font-medium">{formatCurrency(paymentTotals.midPayment)}</span></span>
                      <span>잔금: <span className="font-medium">{formatCurrency(paymentTotals.balance)}</span></span>
                      <span>일시지급: <span className="font-medium">{formatCurrency(paymentTotals.fullPayment)}</span></span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-600">합계별</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">총 합계</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
