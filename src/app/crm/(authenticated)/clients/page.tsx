import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Eye } from "lucide-react";
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

async function getClients() {
  return prisma.client.findMany({
    include: {
      requestTypes: true,
      payments: true,
      projects: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래처 관리</h1>
          <p className="text-gray-500">등록된 거래처를 관리합니다.</p>
        </div>
        <Link href="/crm/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            거래처 추가
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            거래처 목록
          </CardTitle>
          <CardDescription>
            총 {clients.length}개의 거래처가 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                등록된 거래처가 없습니다
              </h3>
              <p className="mt-2 text-gray-500">
                새로운 거래처를 추가해보세요.
              </p>
              <Link href="/crm/clients/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  거래처 추가
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래처명</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>의뢰 유형</TableHead>
                  <TableHead>계약일</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.contact || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.requestTypes.map((rt, idx) => (
                          <Badge key={idx} variant="secondary">
                            {rt.type === "OTHER"
                              ? rt.customType || "기타"
                              : requestTypeLabels[rt.type]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.contractDate
                        ? format(new Date(client.contractDate), "yyyy.MM.dd", {
                            locale: ko,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {client.projects.length}개
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/clients/${client.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
