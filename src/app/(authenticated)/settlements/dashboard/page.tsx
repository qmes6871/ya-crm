"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Loader2, ChevronDown, ChevronUp, Wallet } from "lucide-react";
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

interface RevenueIncentiveDetail {
  name: string;
  rate: number;
  amount: number;
}

interface SettlementSummary {
  companyRevenue: number;
  companyExpense: number;
  totalRevenueIncentives: number;
  revenueIncentiveDetails: RevenueIncentiveDetail[];
  totalManualSettlements: number;
  companyNetProfit: number;
}

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paidAt: string | null;
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
  expenses: ExpenseItem[];
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

// 정산 주기: 토요일 ~ 금요일
function getSettlementWeek(baseDate: Date): { start: Date; end: Date } {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=일, 1=월, ..., 5=금, 6=토
  // 이번 주 토요일 찾기: 토(6)이면 당일, 일(0)이면 -1, 월(1)이면 -2, ..., 금(5)이면 -6
  const diffToSat = day === 6 ? 0 : -(day + 1);
  const start = new Date(d);
  start.setDate(d.getDate() + diffToSat);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // 금요일
  return { start, end };
}

function formatDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SettlementDashboardPage() {
  const { data: session } = useSession();
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [manualSettlements, setManualSettlements] = useState<ManualSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [noIncentive, setNoIncentive] = useState(false);
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showIncentiveDetail, setShowIncentiveDetail] = useState(false);
  const [totalAdvance, setTotalAdvance] = useState(0);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  });

  const setQuickRange = (type: "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (type === "thisWeek") {
      const { start, end } = getSettlementWeek(now);
      setStartDate(formatDateStr(start));
      setEndDate(formatDateStr(end));
    } else if (type === "lastWeek") {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      const { start, end } = getSettlementWeek(lastWeek);
      setStartDate(formatDateStr(start));
      setEndDate(formatDateStr(end));
    } else if (type === "thisMonth") {
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

      const [autoRes, manualRes, advanceRes] = await Promise.all([
        fetch(`/yacrm/api/settlements?${params}`),
        fetch(`/yacrm/api/settlements/manual?${params}`),
        fetch(`/yacrm/api/cash-advances?${params}`),
      ]);

      let hasAuto = false;
      if (autoRes.ok) {
        const data = await autoRes.json();
        setSummary({
          companyRevenue: data.companyRevenue,
          companyExpense: data.companyExpense,
          totalRevenueIncentives: data.totalRevenueIncentives,
          revenueIncentiveDetails: data.revenueIncentiveDetails || [],
          totalManualSettlements: data.totalManualSettlements,
          companyNetProfit: data.companyNetProfit,
        });
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

      // 해당 기간 지급 합계 (거절 제외)
      if (advanceRes.ok) {
        const advList = await advanceRes.json();
        const periodAdvances = advList.filter((a: { status: string; periodStart: string; periodEnd: string }) =>
          a.status !== "REJECTED" &&
          a.periodStart.slice(0, 10) === startDate &&
          a.periodEnd.slice(0, 10) === endDate
        );
        const advTotal = periodAdvances.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
        setTotalAdvance(advTotal);
      } else {
        setTotalAdvance(0);
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
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[130px] sm:w-[160px] text-sm" />
        <span className="text-gray-400">~</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[130px] sm:w-[160px] text-sm" />
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisWeek")}>이번 주</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastWeek")}>지난 주</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
        </div>
      </div>

      {(() => {
        const manualTotal = manualSettlements.reduce((sum, m) => sum + m.amount, 0);
        const autoTotal = settlement?.totalSettlement || 0;
        const grandTotal = autoTotal + manualTotal;
        const finalTotal = grandTotal - totalAdvance;
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              {totalAdvance > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">지급 차감</CardTitle>
                    <Wallet className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">- {formatCurrency(totalAdvance)}</div>
                  </CardContent>
                </Card>
              )}
              {totalAdvance > 0 && (
                <Card className="border-2 border-primary">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">최종 정산금</CardTitle>
                    <Calculator className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${finalTotal >= 0 ? "text-primary" : "text-red-600"}`}>{formatCurrency(finalTotal)}</div>
                    <p className="text-xs text-gray-500 mt-1">총 정산금 - 지급액</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 순익 계산 과정 */}
            {settlement && settlement.fullPaymentRate > 0 && summary && (
              <Card>
                <CardHeader>
                  <CardTitle>순익 계산 과정</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {/* 매출 */}
                    <button
                      type="button"
                      className="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => setShowRevenueDetail(!showRevenueDetail)}
                    >
                      <span className="text-gray-600 flex items-center gap-1">
                        회사 총 매출
                        {showRevenueDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </span>
                      <span className="font-medium">{formatCurrency(summary.companyRevenue)}</span>
                    </button>
                    {showRevenueDetail && settlement.revenues.length > 0 && (
                      <div className="ml-2 md:ml-4 mb-2 border-l-2 border-green-200 pl-2 md:pl-3 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs py-1">날짜</TableHead>
                              <TableHead className="text-xs py-1">프로젝트</TableHead>
                              <TableHead className="text-xs py-1">거래처</TableHead>
                              <TableHead className="text-xs py-1">유형</TableHead>
                              <TableHead className="text-xs py-1 text-right">금액</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settlement.revenues.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs py-1">{r.receivedAt ? format(new Date(r.receivedAt), "yyyy-MM-dd") : "-"}</TableCell>
                                <TableCell className="text-xs py-1">{r.project?.name || "-"}</TableCell>
                                <TableCell className="text-xs py-1">{r.project?.client?.name || "-"}</TableCell>
                                <TableCell className="text-xs py-1">{paymentTypeLabels[r.type] || r.type}</TableCell>
                                <TableCell className="text-xs py-1 text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* 매입 */}
                    <button
                      type="button"
                      className="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                    >
                      <span className="text-gray-600 flex items-center gap-1">
                        (-) 회사 총 매입
                        {showExpenseDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </span>
                      <span className="font-medium text-red-600">- {formatCurrency(summary.companyExpense)}</span>
                    </button>
                    {showExpenseDetail && settlement.expenses.length > 0 && (
                      <div className="ml-2 md:ml-4 mb-2 border-l-2 border-red-200 pl-2 md:pl-3 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs py-1">날짜</TableHead>
                              <TableHead className="text-xs py-1">카테고리</TableHead>
                              <TableHead className="text-xs py-1">설명</TableHead>
                              <TableHead className="text-xs py-1 text-right">금액</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settlement.expenses.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs py-1">{e.paidAt ? format(new Date(e.paidAt), "yyyy-MM-dd") : "-"}</TableCell>
                                <TableCell className="text-xs py-1">{e.category}</TableCell>
                                <TableCell className="text-xs py-1">{e.description || "-"}</TableCell>
                                <TableCell className="text-xs py-1 text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* 매출 인센티브 */}
                    {summary.totalRevenueIncentives > 0 && (
                      <>
                        <button
                          type="button"
                          className="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => setShowIncentiveDetail(!showIncentiveDetail)}
                        >
                          <span className="text-gray-600 flex items-center gap-1">
                            (-) 매출 인센티브
                            {showIncentiveDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                          <span className="font-medium text-red-600">- {formatCurrency(summary.totalRevenueIncentives)}</span>
                        </button>
                        {showIncentiveDetail && summary.revenueIncentiveDetails.length > 0 && (
                          <div className="ml-2 md:ml-4 mb-2 border-l-2 border-orange-200 pl-2 md:pl-3 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs py-1">이름</TableHead>
                                  <TableHead className="text-xs py-1">비율</TableHead>
                                  <TableHead className="text-xs py-1 text-right">금액</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.revenueIncentiveDetails.map((d) => (
                                  <TableRow key={d.name}>
                                    <TableCell className="text-xs py-1">{d.name}</TableCell>
                                    <TableCell className="text-xs py-1">매출 {d.rate}%</TableCell>
                                    <TableCell className="text-xs py-1 text-right font-medium">{formatCurrency(d.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}

                    {/* 추가 정산금 */}
                    {summary.totalManualSettlements > 0 && (
                      <div className="flex justify-between py-2 px-2">
                        <span className="text-gray-600">(-) 추가 정산금</span>
                        <span className="font-medium text-red-600">- {formatCurrency(summary.totalManualSettlements)}</span>
                      </div>
                    )}

                    <div className="border-t pt-3 flex justify-between px-2">
                      <span className="font-semibold text-gray-900">회사 순익</span>
                      <span className={`font-bold ${summary.companyNetProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {formatCurrency(summary.companyNetProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-blue-50 rounded-lg px-3">
                      <span className="text-gray-700">내 순익 정산 ({settlement.fullPaymentRate}%)</span>
                      <span className="font-bold text-blue-600">{formatCurrency(settlement.profitSettlement)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual settlement details */}
            {manualSettlements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>추가 정산 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">날짜</TableHead>
                        <TableHead className="text-xs md:text-sm">구분</TableHead>
                        <TableHead className="text-xs md:text-sm text-right">금액</TableHead>
                        <TableHead className="text-xs md:text-sm text-right hidden md:table-cell">설명</TableHead>
                        <TableHead className="text-xs md:text-sm">지급</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualSettlements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs md:text-sm">{m.targetDate ? format(new Date(m.targetDate), "yyyy-MM-dd") : "-"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                          <TableCell className={`text-xs md:text-sm text-right font-medium ${m.amount < 0 ? "text-red-600" : ""}`}>{formatCurrency(m.amount)}</TableCell>
                          <TableCell className="text-right text-gray-500 text-xs md:text-sm hidden md:table-cell">{m.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={m.isPaid ? "default" : "secondary"} className="text-xs">
                              {m.isPaid ? "지급완료" : "미지급"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                </CardContent>
              </Card>
            )}

          </>
        );
      })()}
    </div>
  );
}
