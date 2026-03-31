"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

const paymentTypeLabels: Record<string, string> = {
  ADVANCE: "선수금",
  MID_PAYMENT: "중도금",
  BALANCE: "잔금",
  FULL_PAYMENT: "전체지급",
};

interface Revenue {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  receivedAt: string | null;
  project: { id: string; name: string; client: { name: string } | null } | null;
}

interface Settlement {
  user: { id: string; name: string; email: string };
  revenueRate: number;
  fullPaymentRate: number;
  companyRevenue: number;
  companyNetProfit: number;
  revenueSettlement: number;
  profitSettlement: number;
  totalSettlement: number;
  revenues: Revenue[];
}

interface ManualSettlement {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  targetDate: string | null;
  isPaid: boolean;
}

const categoryLabels: Record<string, string> = {
  BONUS: "상여금",
  ALLOWANCE: "수당",
  DEDUCTION: "공제",
  OTHER: "기타",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export default function SettlementDashboardPage() {
  const { data: session } = useSession();
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [manualSettlements, setManualSettlements] = useState<ManualSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [noIncentive, setNoIncentive] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  });

  const setQuickRange = (type: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (type === "thisMonth") {
      setStartDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setEndDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`);
    } else if (type === "lastMonth") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`);
      setEndDate(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate())}`);
    } else if (type === "thisYear") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  const fetchSettlement = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setNoIncentive(false);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("userId", session.user.id);

      const [autoRes, manualRes] = await Promise.all([
        fetch(`/yacrm/api/settlements?${params}`),
        fetch(`/yacrm/api/settlements/manual?${params}`),
      ]);

      let hasAuto = false;
      if (autoRes.ok) {
        const data = await autoRes.json();
        if (data.settlements.length > 0) {
          setSettlement(data.settlements[0]);
          hasAuto = true;
        } else {
          setSettlement(null);
        }
      }

      if (manualRes.ok) {
        const manuals = await manualRes.json();
        setManualSettlements(manuals);
        if (!hasAuto && manuals.length === 0) {
          setNoIncentive(true);
        }
      } else if (!hasAuto) {
        setNoIncentive(true);
      }
    } catch (error) {
      console.error("Error fetching settlement:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, session?.user?.id]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 정산 대시보드</h1>
        <p className="text-gray-500">내 프로젝트별 정산 현황을 확인합니다.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
        <span className="text-gray-400">~</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
        </div>
      </div>

      {(() => {
        const manualTotal = manualSettlements.reduce((sum, m) => sum + m.amount, 0);
        const autoTotal = settlement?.totalSettlement || 0;
        const grandTotal = autoTotal + manualTotal;
        const hasData = settlement || manualSettlements.length > 0;

        if (loading) return (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        );

        if (noIncentive) return (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-400">정산 내역이 없습니다.</p>
            </CardContent>
          </Card>
        );

        if (!hasData) return null;

        return (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {settlement && settlement.revenueRate > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">매출 정산 ({settlement.revenueRate}%)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(settlement.revenueSettlement)}</div>
                    <p className="text-xs text-gray-500 mt-1">회사 매출: {formatCurrency(settlement.companyRevenue)}</p>
                  </CardContent>
                </Card>
              )}
              {settlement && settlement.fullPaymentRate > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">순익 정산 ({settlement.fullPaymentRate}%)</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(settlement.profitSettlement)}</div>
                    <p className="text-xs text-gray-500 mt-1">회사 순익: {formatCurrency(settlement.companyNetProfit)}</p>
                  </CardContent>
                </Card>
              )}
              {manualSettlements.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">추가 정산</CardTitle>
                    <Calculator className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${manualTotal >= 0 ? "text-orange-600" : "text-red-600"}`}>{formatCurrency(manualTotal)}</div>
                    <p className="text-xs text-gray-500 mt-1">{manualSettlements.length}건</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 정산금</CardTitle>
                  <Calculator className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Manual settlement details */}
            {manualSettlements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>추가 정산 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead className="text-right">설명</TableHead>
                        <TableHead>지급</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualSettlements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.targetDate ? format(new Date(m.targetDate), "yyyy-MM-dd") : "-"}</TableCell>
                          <TableCell><Badge variant="outline">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                          <TableCell className={`text-right font-medium ${m.amount < 0 ? "text-red-600" : ""}`}>{formatCurrency(m.amount)}</TableCell>
                          <TableCell className="text-right text-gray-500">{m.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={m.isPaid ? "default" : "secondary"} className="text-xs">
                              {m.isPaid ? "지급완료" : "미지급"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Revenue details */}
            {settlement && (
              <Card>
                <CardHeader>
                  <CardTitle>매출 상세 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  {settlement.revenues.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">해당 기간의 매출 내역이 없습니다.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>날짜</TableHead>
                          <TableHead>프로젝트</TableHead>
                          <TableHead>거래처</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead className="text-right">금액</TableHead>
                          <TableHead className="text-right">설명</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlement.revenues.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.receivedAt ? format(new Date(r.receivedAt), "yyyy-MM-dd") : "-"}</TableCell>
                            <TableCell>{r.project?.name || "-"}</TableCell>
                            <TableCell>{r.project?.client?.name || "-"}</TableCell>
                            <TableCell><Badge variant="outline">{paymentTypeLabels[r.type] || r.type}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                            <TableCell className="text-right text-gray-500">{r.description || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}
    </div>
  );
}
