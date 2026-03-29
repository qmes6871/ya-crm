import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, Globe, Folder, Database, Key, ExternalLink, Github, Pencil, FolderKanban, Building2, User } from "lucide-react";
import { ServerUsage } from "@/components/servers/server-usage";
import { ServerStatusToggle } from "@/components/servers/server-status-toggle";
import { ServerDeleteButton } from "@/components/servers/server-delete-button";

const serverTypeLabels: Record<string, { label: string; price: string }> = {
  GENERAL: { label: "일반형", price: "월 3,000원" },
  BUSINESS: { label: "비즈니스", price: "월 8,000원" },
  FIRST_CLASS: { label: "퍼스트클래스", price: "월 15,000원" },
  GIANT: { label: "자이언트", price: "월 20,000원" },
  UNLIMITED_PLUS: { label: "무제한 트래픽 플러스", price: "월 30,000원" },
  OTHER: { label: "기타", price: "-" },
};

const hostingProviderLabels: Record<string, string> = {
  SELF: "자체 서버",
  CAFE24: "카페24호스팅",
  GABIA: "가비아",
  AWS: "AWS",
  OTHER: "기타",
};

const projectStatusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

async function getServer(id: string) {
  return prisma.server.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          client: {
            select: { id: true, name: true },
          },
          manager: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const server = await getServer(id);

  if (!server) {
    notFound();
  }

  const serverTypeInfo = server.serverType
    ? serverTypeLabels[server.serverType]
    : null;

  const hostingLabel = server.hostingProvider
    ? server.hostingProvider === "OTHER"
      ? server.hostingProviderCustom || "기타"
      : hostingProviderLabels[server.hostingProvider] || server.hostingProvider
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/servers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
          <p className="text-gray-500">서버 상세 정보</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/servers/${server.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </Button>
          </Link>
          <ServerDeleteButton serverId={server.id} serverName={server.name} localPath={server.localPath} />
        </div>
      </div>

      {/* 서버 상태 관리 */}
      <Card>
        <CardContent className="pt-6">
          <ServerStatusToggle
            serverId={server.id}
            isActive={server.isActive}
            suspendedAt={server.suspendedAt?.toISOString() || null}
            localPath={server.localPath}
          />
        </CardContent>
      </Card>

      {/* 연동된 프로젝트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            연동된 프로젝트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${server.project.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {server.project.name}
                </Link>
                <Badge className={projectStatusLabels[server.project.status]?.color}>
                  {projectStatusLabels[server.project.status]?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <Link
                    href={`/clients/${server.project.client.id}`}
                    className="hover:underline"
                  >
                    {server.project.client.name}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{server.project.manager.name}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{server.project.progress}%</div>
              <div className="text-sm text-gray-500">진행률</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">서버명</p>
                <p className="font-medium">{server.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">서버 타입</p>
                {server.serverType ? (
                  <Badge variant="secondary">
                    {server.serverType === "OTHER"
                      ? server.serverTypeCustom || "기타"
                      : serverTypeInfo?.label || server.serverType}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">호스팅 업체</p>
                <p className="font-medium">{hostingLabel || <span className="text-gray-400">-</span>}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">서버 비용 결제일</p>
                <p className="font-medium">
                  {server.paymentDay ? `매월 ${server.paymentDay}일` : <span className="text-gray-400">-</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">연동 프로젝트</p>
                <Link
                  href={`/projects/${server.project.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {server.project.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-gray-500">거래처</p>
                <Link
                  href={`/clients/${server.project.client.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {server.project.client.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-gray-500">담당자</p>
                <p className="font-medium">{server.project.manager.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 서버 사용량 */}
        {server.localPath && server.serverType && server.serverType !== "OTHER" && (
          <ServerUsage serverId={server.id} />
        )}

        {/* 도메인 & 경로 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              도메인 & 경로
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">도메인</p>
              {server.domain ? (
                <a
                  href={server.domain.startsWith("http") ? server.domain : `https://${server.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-blue-600 hover:underline"
                >
                  {server.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Folder className="h-4 w-4" />
                로컬 폴더 경로
              </p>
              {server.localPath ? (
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{server.localPath}</p>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Github className="h-4 w-4" />
                깃허브 경로
              </p>
              {server.githubUrl ? (
                <a
                  href={server.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-blue-600 hover:underline"
                >
                  {server.githubUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 관리자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              관리자 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">관리자 URL</p>
              {server.adminUrl ? (
                <a
                  href={server.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-blue-600 hover:underline"
                >
                  {server.adminUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">관리자 아이디</p>
                <p className="font-mono text-sm">{server.adminId || <span className="text-gray-400">-</span>}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">관리자 비밀번호</p>
                <p className="font-mono text-sm">{server.adminPassword || <span className="text-gray-400">-</span>}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FTP 정보 */}
        {(server.ftpHost || server.ftpId) && (
          <Card>
            <CardHeader>
              <CardTitle>FTP 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">FTP 호스트</p>
                  <p className="font-mono text-sm">{server.ftpHost || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">FTP 포트</p>
                  <p className="font-mono text-sm">{server.ftpPort || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">FTP 아이디</p>
                  <p className="font-mono text-sm">{server.ftpId || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">FTP 비밀번호</p>
                  <p className="font-mono text-sm">{server.ftpPassword || <span className="text-gray-400">-</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DB 정보 */}
        {(server.dbHost || server.dbName) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                데이터베이스 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">DB 호스트</p>
                  <p className="font-mono text-sm">{server.dbHost || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">DB 포트</p>
                  <p className="font-mono text-sm">{server.dbPort || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">DB 이름</p>
                  <p className="font-mono text-sm">{server.dbName || <span className="text-gray-400">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">DB 사용자</p>
                  <p className="font-mono text-sm">{server.dbUser || <span className="text-gray-400">-</span>}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">DB 비밀번호</p>
                  <p className="font-mono text-sm">{server.dbPassword || <span className="text-gray-400">-</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 메모 */}
        {server.note && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>메모</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{server.note}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
