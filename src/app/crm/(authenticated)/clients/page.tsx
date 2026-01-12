import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Eye } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ClientFilters } from "@/components/client/ClientFilters";
import { Suspense } from "react";

const requestTypeLabels: Record<string, string> = {
  WEB_DEV: "웹 개발",
  SHOPPING_MALL: "쇼핑몰 개발",
  APP_DEV: "앱 개발",
  PLATFORM_DEV: "플랫폼 개발",
  CRM_DEV: "CRM 개발",
  OTHER: "기타",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

interface SearchParams {
  type?: string;
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

async function getClients(searchParams: SearchParams) {
  const dateFilter = getDateFilter(searchParams.date);

  const where: Record<string, unknown> = {};

  if (searchParams.type && searchParams.type !== "all") {
    where.requestTypes = {
      some: {
        type: searchParams.type,
      },
    };
  }

  if (dateFilter) {
    where.contractDate = dateFilter;
  }

  return prisma.client.findMany({
    where,
    include: {
      requestTypes: true,
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          payments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const clients = await getClients(params);

  // Calculate total amount for each client from their projects' payments
  const clientsWithTotals = clients.map((client) => {
    const totalAmount = client.projects.reduce((projectSum, project) => {
      const projectPayments = project.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
      return projectSum + projectPayments;
    }, 0);
    return { ...client, totalAmount };
  });

  // Filter by amount if specified
  const amountRange = getAmountRange(params.amount);
  const filteredClients = amountRange
    ? clientsWithTotals.filter(
        (c) => c.totalAmount >= amountRange.min && c.totalAmount < amountRange.max
      )
    : clientsWithTotals;

  // Calculate grand total and totals by payment type
  const grandTotal = filteredClients.reduce((sum, client) => sum + client.totalAmount, 0);

  // Calculate totals by payment type
  const paymentTotals = filteredClients.reduce(
    (acc, client) => {
      client.projects.forEach((project) => {
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
      });
      return acc;
    },
    { advance: 0, midPayment: 0, balance: 0, fullPayment: 0 }
  );

  // Count active filters
  const activeFilterCount = [
    params.type,
    params.amount,
    params.date,
  ].filter((v) => v && v !== "all").length;

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

      <Suspense fallback={<div className="h-24 bg-gray-100 animate-pulse rounded-lg" />}>
        <ClientFilters />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            거래처 목록
          </CardTitle>
          <CardDescription>
            총 {filteredClients.length}개의 거래처
            {activeFilterCount > 0 && (
              <span className="ml-2 text-blue-600">
                (필터 {activeFilterCount}개 적용됨)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {activeFilterCount > 0
                  ? "필터 조건에 맞는 거래처가 없습니다"
                  : "등록된 거래처가 없습니다"}
              </h3>
              <p className="mt-2 text-gray-500">
                {activeFilterCount > 0
                  ? "다른 필터 조건을 선택해보세요."
                  : "새로운 거래처를 추가해보세요."}
              </p>
              {activeFilterCount === 0 && (
                <Link href="/crm/clients/new" className="mt-4 inline-block">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    거래처 추가
                  </Button>
                </Link>
              )}
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
                  <TableHead className="text-right">합계 금액</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        className="hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
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
                    <TableCell className="text-right font-medium">
                      {client.totalAmount > 0 ? formatCurrency(client.totalAmount) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/clients/${client.id}`}>
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
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">총 합계</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
