import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderKanban, Eye } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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

async function getProjects() {
  return prisma.project.findMany({
    include: {
      client: {
        select: { id: true, name: true },
      },
      manager: {
        select: { id: true, name: true },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  // Calculate total amount for each project from payments
  const projectsWithTotals = projects.map((project) => {
    const totalAmount = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return { ...project, totalAmount };
  });

  // Calculate grand total
  const grandTotal = projectsWithTotals.reduce((sum, project) => sum + project.totalAmount, 0);

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            프로젝트 목록
          </CardTitle>
          <CardDescription>
            총 {projects.length}개의 프로젝트
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                등록된 프로젝트가 없습니다
              </h3>
              <p className="mt-2 text-gray-500">
                새로운 프로젝트를 생성해보세요.
              </p>
              <Link href="/crm/projects/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  프로젝트 생성
                </Button>
              </Link>
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
                  <TableHead>생성일</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsWithTotals.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client.name}</TableCell>
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
                    <TableCell>
                      {format(new Date(project.createdAt), "yyyy.MM.dd", { locale: ko })}
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
