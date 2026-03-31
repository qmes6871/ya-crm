"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";

interface MonthlySummary {
  year: number;
  month: number;
  revenue: number;
  expense: number;
  profit: number;
}

interface Summary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  monthly: MonthlySummary[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export default function RevenueDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-12-31`;
  });

  const setQuickRange = (type: "thisMonth" | "lastMonth" | "thisYear" | "lastYear") => {
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
    } else if (type === "lastYear") {
      setStartDate(`${now.getFullYear() - 1}-01-01`);
      setEndDate(`${now.getFullYear() - 1}-12-31`);
    }
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/yacrm/api/revenue/summary?${params}`);
      if (res.ok) setSummary(await res.json());
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const maxAmount = summary
    ? Math.max(...summary.monthly.map((m) => Math.max(m.revenue, m.expense)), 1)
    : 1;

  const showYear = summary ? new Set(summary.monthly.map((m) => m.year)).size > 1 : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">순익 대시보드</h1>
          <p className="text-gray-500">매출과 매입을 한눈에 확인합니다.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[160px]"
        />
        <span className="text-gray-400">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[160px]"
        />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastYear")}>작년</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매입</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpense)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">순익</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-primary" : "text-red-600"}`}>
                  {formatCurrency(summary.netProfit)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>월별 추이</CardTitle>
              <CardDescription>월별 매출/매입/순익 현황</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.monthly.every((m) => m.revenue === 0 && m.expense === 0) ? (
                <p className="text-center text-gray-400 py-8">데이터가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {summary.monthly.map((m) => (
                    <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-gray-500 text-right shrink-0">
                        {showYear ? `${m.year}.${m.month}월` : `${m.month}월`}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 rounded bg-green-400 transition-all"
                            style={{ width: `${(m.revenue / maxAmount) * 100}%`, minWidth: m.revenue > 0 ? "4px" : "0" }}
                          />
                          <span className="text-xs text-gray-500 shrink-0">
                            {m.revenue > 0 ? formatCurrency(m.revenue) : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 rounded bg-red-400 transition-all"
                            style={{ width: `${(m.expense / maxAmount) * 100}%`, minWidth: m.expense > 0 ? "4px" : "0" }}
                          />
                          <span className="text-xs text-gray-500 shrink-0">
                            {m.expense > 0 ? formatCurrency(m.expense) : ""}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-medium w-24 text-right shrink-0 ${m.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {m.revenue === 0 && m.expense === 0 ? "-" : formatCurrency(m.profit)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-2 border-t text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-400" />
                      매출
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-400" />
                      매입
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
