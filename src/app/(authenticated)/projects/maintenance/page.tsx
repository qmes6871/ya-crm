import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench, Eye } from "lucide-react";
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

const maintenanceLabels: Record<string, string> = {
  BASIC_FREE: "기본 (무료)",
  BASIC: "베이직 (월 5,000원)",
  SPECIAL: "스페셜 (월 10,000원)",
  PRO: "프로 (월 20,000원)",
  PLUS: "플러스 (월 100,000원)",
  OTHER: "기타",
};

const serverCostLabels: Record<string, string> = {
  GENERAL: "일반형 (월 3,000원)",
  BUSINESS: "비즈니스 (월 8,000원)",
  FIRST_CLASS: "퍼스트클래스 (월 15,000원)",
  GIANT: "자이언트 (월 20,000원)",
  UNLIMITED_PLUS: "무제한 트래픽 플러스 (월 30,000원)",
  OTHER: "기타",
};

async function getMaintenanceProjects() {
  return prisma.project.findMany({
    where: {
      status: { in: ["OPEN", "COMPLETED"] },
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      manager: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function MaintenanceProjectsPage() {
  const projects = await getMaintenanceProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">오픈 프로젝트 (유지보수)</h1>
        <p className="text-gray-500">오픈 및 완료된 프로젝트의 유지보수 현황을 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            유지보수 프로젝트 목록
          </CardTitle>
          <CardDescription>
            총 {projects.length}개의 프로젝트
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                오픈된 프로젝트가 없습니다
              </h3>
              <p className="mt-2 text-gray-500">
                프로젝트가 오픈되면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트명</TableHead>
                  <TableHead>거래처</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>서버비용</TableHead>
                  <TableHead>유지보수</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${project.client.id}`}
                        className="hover:underline"
                      >
                        {project.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{project.manager.name}</TableCell>
                    <TableCell>
                      <Badge className={statusLabels[project.status]?.color}>
                        {statusLabels[project.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.serverCost === "OTHER"
                        ? project.serverCostCustom
                        : project.serverCost
                          ? serverCostLabels[project.serverCost]
                          : <span className="text-gray-400">미설정</span>}
                    </TableCell>
                    <TableCell>
                      {project.maintenance === "OTHER"
                        ? project.maintenanceCustom
                        : project.maintenance
                          ? maintenanceLabels[project.maintenance]
                          : <span className="text-gray-400">미설정</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          자세히 보기
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
