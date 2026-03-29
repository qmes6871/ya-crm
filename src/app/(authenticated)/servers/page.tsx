import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Plus } from "lucide-react";
import { ServerListFilter } from "@/components/servers/server-list-filter";

const serverTypeLabels: Record<string, { label: string; price: string }> = {
  GENERAL: { label: "일반형", price: "월 3,000원" },
  BUSINESS: { label: "비즈니스", price: "월 8,000원" },
  FIRST_CLASS: { label: "퍼스트클래스", price: "월 15,000원" },
  GIANT: { label: "자이언트", price: "월 20,000원" },
  UNLIMITED_PLUS: { label: "무제한 트래픽 플러스", price: "월 30,000원" },
  OTHER: { label: "기타", price: "-" },
};

async function getServers() {
  return prisma.server.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ServersPage() {
  const servers = await getServers();

  // 서버 타입별 통계
  const serverStats = servers.reduce((acc, server) => {
    const type = server.serverType || "UNKNOWN";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">서버 리스트</h1>
          <p className="text-gray-500">등록된 서버 현황을 관리합니다.</p>
        </div>
        <Link href="/servers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            서버 등록
          </Button>
        </Link>
      </div>

      {/* 서버 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Object.entries(serverTypeLabels).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription>{value.label}</CardDescription>
              <CardTitle className="text-2xl">{serverStats[key] || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{value.price}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            서버 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-12">
              <Server className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                등록된 서버가 없습니다
              </h3>
              <p className="mt-2 text-gray-500">
                새로운 서버를 등록하세요.
              </p>
              <Link href="/servers/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  서버 등록
                </Button>
              </Link>
            </div>
          ) : (
            <ServerListFilter servers={servers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
