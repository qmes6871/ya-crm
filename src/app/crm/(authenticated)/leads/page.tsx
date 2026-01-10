import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, Eye } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

const sourceTypeLabels: Record<string, string> = {
  SOOMGO: "숨고",
  KMONG: "크몽",
  PHONE: "전화",
  WEBSITE: "홈페이지",
  OTHER: "기타",
};

const resultLabels: Record<string, string> = {
  NOT_CALCULATED: "결과 미산출",
  QUOTE_PROVIDED: "견적 안내",
  QUOTE_SENT: "견적서 납기",
  MEETING: "미팅",
  WAITING_RESPONSE: "회신 대기",
  OTHER: "기타",
};

const resultColors: Record<string, string> = {
  NOT_CALCULATED: "bg-gray-100 text-gray-800",
  QUOTE_PROVIDED: "bg-blue-100 text-blue-800",
  QUOTE_SENT: "bg-purple-100 text-purple-800",
  MEETING: "bg-green-100 text-green-800",
  WAITING_RESPONSE: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

async function getLeads() {
  return prisma.lead.findMany({
    include: {
      consultant: {
        select: { id: true, name: true },
      },
      sources: true,
      quotes: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function LeadsPage() {
  const session = await auth();
  const leads = await getLeads();

  // Calculate total quote amount for each lead
  const leadsWithTotals = leads.map((lead) => {
    const totalQuoteAmount = lead.quotes.reduce((sum, quote) => sum + quote.amount, 0);
    return { ...lead, totalQuoteAmount };
  });

  // Calculate grand total
  const grandTotal = leadsWithTotals.reduce((sum, lead) => sum + lead.totalQuoteAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">가망고객</h1>
          <p className="text-gray-500">가망고객을 관리합니다.</p>
        </div>
        <Link href="/crm/leads/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            가망고객 추가
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            가망고객 목록
          </CardTitle>
          <CardDescription>
            총 {leads.length}명의 가망고객이 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                등록된 가망고객이 없습니다
              </h3>
              <p className="mt-2 text-gray-500">
                새로운 가망고객을 추가해보세요.
              </p>
              <Link href="/crm/leads/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  가망고객 추가
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객명</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>경로</TableHead>
                  <TableHead>상담자</TableHead>
                  <TableHead>상담일</TableHead>
                  <TableHead>결과</TableHead>
                  <TableHead className="text-right">견적 금액</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsWithTotals.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.customerName}</TableCell>
                    <TableCell>{lead.contact || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.sources.map((source, idx) => (
                          <Badge key={idx} variant="outline">
                            {source.type === "OTHER"
                              ? source.customType || "기타"
                              : sourceTypeLabels[source.type]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{lead.consultant.name}</TableCell>
                    <TableCell>
                      {format(new Date(lead.consultDate), "yyyy.MM.dd", { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <Badge className={resultColors[lead.result]}>
                        {lead.result === "OTHER"
                          ? lead.resultNote || "기타"
                          : resultLabels[lead.result]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {lead.totalQuoteAmount > 0 ? formatCurrency(lead.totalQuoteAmount) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/leads/${lead.id}`}>
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
                  <TableCell colSpan={6} className="font-bold">총 합계</TableCell>
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
