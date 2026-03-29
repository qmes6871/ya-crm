import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Building2, Phone, Calendar, FileText, FolderKanban } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const requestTypeLabels: Record<string, string> = {
  WEB_DEV: "웹 개발",
  SHOPPING_MALL: "쇼핑몰 개발",
  APP_DEV: "앱 개발",
  PLATFORM_DEV: "플랫폼 개발",
  CRM_DEV: "CRM 개발",
  OTHER: "기타",
};

const projectStatusLabels: Record<string, string> = {
  PLANNING: "기획",
  FIRST_DRAFT: "1차 시안 작업",
  FIRST_DRAFT_REVIEW: "1차 시안 공개",
  REVISION: "시안 수정",
  FINAL_REVIEW: "시안 공개",
  OPEN: "오픈",
  COMPLETED: "완료",
};

async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      requestTypes: true,
      projects: {
        include: {
          manager: {
            select: { id: true, name: true },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  // Calculate total payments from all projects
  const totalPayments = client.projects.reduce((sum, project) => {
    return sum + project.payments.reduce((pSum, p) => pSum + p.amount, 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500">거래처 상세 정보</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${client.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              수정
            </Button>
          </Link>
          <DeleteButton
            id={client.id}
            endpoint="/api/clients"
            redirectPath="/clients"
            itemName={client.name}
          />
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            기본 정보
          </CardTitle>
          <CardDescription>
            총 매출: {totalPayments.toLocaleString()}원 (프로젝트 합계)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-gray-500">거래처명</p>
              <p className="text-lg">{client.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">연락처</p>
              <p className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {client.contact || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">계약날짜</p>
              <p className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {client.contractDate
                  ? format(new Date(client.contractDate), "yyyy년 MM월 dd일", { locale: ko })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">1차 시안 공유 일정</p>
              <p className="text-lg">
                {client.firstDraftDate
                  ? format(new Date(client.firstDraftDate), "yyyy년 MM월 dd일", { locale: ko })
                  : "-"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">의뢰 유형</p>
            <div className="flex flex-wrap gap-2">
              {client.requestTypes.length > 0 ? (
                client.requestTypes.map((rt, idx) => (
                  <Badge key={idx} variant="secondary">
                    {rt.type === "OTHER"
                      ? rt.customType || "기타"
                      : requestTypeLabels[rt.type]}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">진행 요청사항</p>
            <p className="whitespace-pre-wrap text-gray-700">
              {client.requirements || "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 연동된 프로젝트 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              연동된 프로젝트
            </CardTitle>
            <CardDescription>
              총 {client.projects.length}개의 프로젝트
            </CardDescription>
          </div>
          <Link href={`/projects/new?clientId=${client.id}`}>
            <Button>프로젝트 생성</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.projects.length > 0 ? (
            <div className="space-y-4">
              {client.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        담당자: {project.manager.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge>{projectStatusLabels[project.status]}</Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        진행률: {project.progress}%
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">
              연동된 프로젝트가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
