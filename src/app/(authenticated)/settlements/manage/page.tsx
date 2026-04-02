"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calculator, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Eye, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const categoryLabels: Record<string, string> = {
  BONUS: "상여금",
  ALLOWANCE: "수당",
  DEDUCTION: "공제",
  OTHER: "기타",
};

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

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paidAt: string | null;
}

interface RevenueIncentiveDetail {
  name: string;
  rate: number;
  amount: number;
}

interface UserDashboardData {
  settlement: {
    revenueRate: number;
    fullPaymentRate: number;
    companyRevenue: number;
    companyNetProfit: number;
    revenueSettlement: number;
    profitSettlement: number;
    totalSettlement: number;
    revenues: Revenue[];
    expenses: ExpenseItem[];
  } | null;
  summary: {
    companyRevenue: number;
    companyExpense: number;
    totalRevenueIncentives: number;
    revenueIncentiveDetails: RevenueIncentiveDetail[];
    totalManualSettlements: number;
    companyNetProfit: number;
  } | null;
  manualSettlements: ManualSettlement[];
  totalAdvance: number;
}

interface ManualSettlement {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  category: string;
  amount: number;
  description: string | null;
  targetDate: string | null;
  isPaid: boolean;
}

interface AutoSettlement {
  user: { id: string; name: string; email: string };
  revenueRate: number;
  fullPaymentRate: number;
  companyRevenue: number;
  companyNetProfit: number;
  revenueSettlement: number;
  profitSettlement: number;
  totalSettlement: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CashAdvance {
  id: string;
  userId: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
}

interface CombinedRow {
  user: User;
  autoRevenueSettlement: number;
  autoProfitSettlement: number;
  autoTotal: number;
  revenueRate: number;
  fullPaymentRate: number;
  manualTotal: number;
  manualItems: ManualSettlement[];
  advanceTotal: number;
  grandTotal: number;
  finalTotal: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

function formatNumberWithCommas(value: string) {
  const num = value.replace(/[^\d-]/g, "");
  if (!num || num === "-") return num;
  const isNeg = num.startsWith("-");
  const abs = num.replace(/-/g, "");
  if (!abs) return isNeg ? "-" : "";
  return (isNeg ? "-" : "") + new Intl.NumberFormat("ko-KR").format(parseInt(abs));
}

function parseFormattedNumber(value: string) {
  return value.replace(/,/g, "");
}

// 정산 주기: 토요일 ~ 금요일
function getSettlementWeek(baseDate: Date): { start: Date; end: Date } {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diffToSat = day === 6 ? 0 : -(day + 1);
  const start = new Date(d);
  start.setDate(d.getDate() + diffToSat);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SettlementManagePage() {
  const [autoSettlements, setAutoSettlements] = useState<AutoSettlement[]>([]);
  const [manualSettlements, setManualSettlements] = useState<ManualSettlement[]>([]);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // User Dashboard Modal
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardUser, setDashboardUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showIncentiveDetail, setShowIncentiveDetail] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    category: "BONUS",
    amount: "",
    description: "",
    targetDate: "",
    isPaid: false,
  });

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [autoRes, manualRes, usersRes, advRes] = await Promise.all([
        fetch(`/yacrm/api/settlements?${params}`),
        fetch(`/yacrm/api/settlements/manual?${params}`),
        fetch("/yacrm/api/users"),
        fetch("/yacrm/api/cash-advances"),
      ]);

      if (autoRes.ok) {
        const data = await autoRes.json();
        setAutoSettlements(data.settlements);
      }
      if (manualRes.ok) setManualSettlements(await manualRes.json());
      if (usersRes.ok) setAllUsers(await usersRes.json());
      if (advRes.ok) setCashAdvances(await advRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 해당 기간의 가불 합계 (거절 제외)를 유저별로 계산
  const advanceByUser = (() => {
    const map = new Map<string, number>();
    for (const adv of cashAdvances) {
      if (adv.status === "REJECTED") continue;
      const ps = adv.periodStart.slice(0, 10);
      const pe = adv.periodEnd.slice(0, 10);
      if (ps === startDate && pe === endDate) {
        map.set(adv.userId, (map.get(adv.userId) || 0) + adv.amount);
      }
    }
    return map;
  })();

  // Combine auto + manual + advance into per-user rows
  const combinedRows: CombinedRow[] = (() => {
    const map = new Map<string, CombinedRow>();

    for (const a of autoSettlements) {
      const advTotal = advanceByUser.get(a.user.id) || 0;
      const grandTotal = a.totalSettlement;
      map.set(a.user.id, {
        user: a.user,
        autoRevenueSettlement: a.revenueSettlement,
        autoProfitSettlement: a.profitSettlement,
        autoTotal: a.totalSettlement,
        revenueRate: a.revenueRate,
        fullPaymentRate: a.fullPaymentRate,
        manualTotal: 0,
        manualItems: [],
        advanceTotal: advTotal,
        grandTotal,
        finalTotal: grandTotal - advTotal,
      });
    }

    for (const m of manualSettlements) {
      const existing = map.get(m.userId);
      if (existing) {
        existing.manualTotal += m.amount;
        existing.manualItems.push(m);
        existing.grandTotal = existing.autoTotal + existing.manualTotal;
        existing.finalTotal = existing.grandTotal - existing.advanceTotal;
      } else {
        const advTotal = advanceByUser.get(m.userId) || 0;
        const grandTotal = m.amount;
        map.set(m.userId, {
          user: m.user,
          autoRevenueSettlement: 0,
          autoProfitSettlement: 0,
          autoTotal: 0,
          revenueRate: 0,
          fullPaymentRate: 0,
          manualTotal: m.amount,
          manualItems: [m],
          advanceTotal: advTotal,
          grandTotal,
          finalTotal: grandTotal - advTotal,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.finalTotal - a.finalTotal);
  })();

  const openDashboard = async (user: User) => {
    setDashboardUser(user);
    setDashboardOpen(true);
    setDashboardLoading(true);
    setShowRevenueDetail(false);
    setShowExpenseDetail(false);
    setShowIncentiveDetail(false);
    try {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("userId", user.id);

      const [autoRes, manualRes, advRes] = await Promise.all([
        fetch(`/yacrm/api/settlements?${params}`),
        fetch(`/yacrm/api/settlements/manual?${params.toString()}&userId=${user.id}`),
        fetch(`/yacrm/api/cash-advances?userId=${user.id}`),
      ]);

      let settlement = null;
      let summary = null;
      if (autoRes.ok) {
        const data = await autoRes.json();
        summary = {
          companyRevenue: data.companyRevenue,
          companyExpense: data.companyExpense,
          totalRevenueIncentives: data.totalRevenueIncentives,
          revenueIncentiveDetails: data.revenueIncentiveDetails || [],
          totalManualSettlements: data.totalManualSettlements,
          companyNetProfit: data.companyNetProfit,
        };
        if (data.settlements.length > 0) {
          settlement = data.settlements[0];
        }
      }

      const manuals = manualRes.ok ? await manualRes.json() : [];

      let totalAdv = 0;
      if (advRes.ok) {
        const advList = await advRes.json();
        totalAdv = advList
          .filter((a: { status: string; periodStart: string; periodEnd: string }) =>
            a.status !== "REJECTED" &&
            a.periodStart.slice(0, 10) === startDate &&
            a.periodEnd.slice(0, 10) === endDate
          )
          .reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
      }

      setDashboardData({ settlement, summary, manualSettlements: manuals, totalAdvance: totalAdv });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ userId: "", category: "BONUS", amount: "", description: "", targetDate: startDate, isPaid: false });
    setDialogOpen(true);
  };

  const openEdit = (m: ManualSettlement) => {
    setEditingId(m.id);
    setForm({
      userId: m.userId,
      category: m.category,
      amount: m.amount.toString(),
      description: m.description || "",
      targetDate: m.targetDate ? m.targetDate.slice(0, 10) : "",
      isPaid: m.isPaid,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.userId || !form.category || !form.amount) {
      alert("직원, 구분, 금액은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/yacrm/api/settlements/manual/${editingId}` : "/yacrm/api/settlements/manual";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "저장에 실패했습니다.");
      }
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/yacrm/api/settlements/manual/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("삭제에 실패했습니다.");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">정산금 관리</h1>
          <p className="text-gray-500">직원별 정산 현황을 확인하고 수동 정산금을 추가합니다.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          정산금 추가
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
        <span className="text-gray-400">~</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisWeek")}>이번 주</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastWeek")}>지난 주</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : combinedRows.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-400">정산 내역이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              직원별 정산 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">매출 정산</TableHead>
                  <TableHead className="text-right">순익 정산</TableHead>
                  <TableHead className="text-right">추가 정산</TableHead>
                  <TableHead className="text-right">총 정산금</TableHead>
                  <TableHead className="text-right">가불</TableHead>
                  <TableHead className="text-right">최종 정산금</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedRows.map((row) => (
                  <>
                    <TableRow
                      key={row.user.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedUser(expandedUser === row.user.id ? null : row.user.id)}
                    >
                      <TableCell>
                        {expandedUser === row.user.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {row.user.name}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); openDashboard(row.user); }}
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.revenueRate > 0 ? (
                          <span className="text-green-600">{formatCurrency(row.autoRevenueSettlement)} <span className="text-xs text-gray-400">({row.revenueRate}%)</span></span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.fullPaymentRate > 0 ? (
                          <span className="text-blue-600">{formatCurrency(row.autoProfitSettlement)} <span className="text-xs text-gray-400">({row.fullPaymentRate}%)</span></span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.manualTotal !== 0 ? (
                          <span className={row.manualTotal >= 0 ? "text-orange-600" : "text-red-600"}>
                            {formatCurrency(row.manualTotal)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.grandTotal)}</TableCell>
                      <TableCell className="text-right">
                        {row.advanceTotal > 0 ? (
                          <span className="text-red-600">- {formatCurrency(row.advanceTotal)}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(row.finalTotal)}</TableCell>
                    </TableRow>
                    {expandedUser === row.user.id && (
                      <TableRow key={`${row.user.id}-detail`}>
                        <TableCell colSpan={8} className="bg-gray-50 p-0">
                          <div className="p-4 space-y-3">
                            {/* Auto settlement summary */}
                            {row.autoTotal > 0 && (
                              <div className="text-sm space-y-1">
                                <p className="font-medium text-gray-700">자동 정산</p>
                                {row.revenueRate > 0 && (
                                  <p className="text-gray-500 pl-3">매출 정산: 회사 매출 × {row.revenueRate}% = {formatCurrency(row.autoRevenueSettlement)}</p>
                                )}
                                {row.fullPaymentRate > 0 && (
                                  <p className="text-gray-500 pl-3">순익 정산: 회사 순익 × {row.fullPaymentRate}% = {formatCurrency(row.autoProfitSettlement)}</p>
                                )}
                              </div>
                            )}

                            {/* Manual settlements */}
                            {row.manualItems.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 text-sm mb-2">추가 정산</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>날짜</TableHead>
                                      <TableHead>구분</TableHead>
                                      <TableHead className="text-right">금액</TableHead>
                                      <TableHead className="text-right">설명</TableHead>
                                      <TableHead>지급</TableHead>
                                      <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.manualItems.map((m) => (
                                      <TableRow key={m.id}>
                                        <TableCell className="text-sm">{m.targetDate ? format(new Date(m.targetDate), "yyyy-MM-dd") : "-"}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-xs">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                                        <TableCell className={`text-right text-sm font-medium ${m.amount >= 0 ? "" : "text-red-600"}`}>{formatCurrency(m.amount)}</TableCell>
                                        <TableCell className="text-right text-sm text-gray-500">{m.description || "-"}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.isPaid ? "default" : "secondary"} className="text-xs">
                                            {m.isPaid ? "지급완료" : "미지급"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {row.autoTotal === 0 && row.manualItems.length === 0 && (
                              <p className="text-center text-gray-400 text-sm py-2">상세 내역이 없습니다.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-bold">합계</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(combinedRows.reduce((sum, r) => sum + r.finalTotal, 0))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Manual Settlement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "정산금 수정" : "정산금 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>직원 *</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="직원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>구분 *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>금액 * <span className="text-xs text-gray-400">(공제는 음수 입력)</span></Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberWithCommas(form.amount)}
                onChange={(e) => setForm({ ...form, amount: parseFormattedNumber(e.target.value) })}
                placeholder="금액을 입력하세요"
              />
            </div>
            <div>
              <Label>대상 날짜</Label>
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="상여금, 수당 등 설명을 입력하세요"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPaid"
                checked={form.isPaid}
                onCheckedChange={(checked) => setForm({ ...form, isPaid: checked as boolean })}
              />
              <Label htmlFor="isPaid" className="cursor-pointer">지급 완료</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Dashboard Modal */}
      <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dashboardUser?.name}님의 정산 대시보드 ({startDate} ~ {endDate})</DialogTitle>
          </DialogHeader>
          {dashboardLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : dashboardData ? (() => {
            const { settlement, summary, manualSettlements: dManuals, totalAdvance } = dashboardData;
            const manualTotal = dManuals.reduce((sum, m) => sum + m.amount, 0);
            const autoTotal = settlement?.totalSettlement || 0;
            const grandTotal = autoTotal + manualTotal;
            const finalTotal = grandTotal - totalAdvance;

            return (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                  {settlement && settlement.revenueRate > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                        <CardTitle className="text-xs font-medium">매출 정산 ({settlement.revenueRate}%)</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(settlement.revenueSettlement)}</div>
                        <p className="text-xs text-gray-500">회사 매출: {formatCurrency(settlement.companyRevenue)}</p>
                      </CardContent>
                    </Card>
                  )}
                  {settlement && settlement.fullPaymentRate > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                        <CardTitle className="text-xs font-medium">순익 정산 ({settlement.fullPaymentRate}%)</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-lg font-bold text-blue-600">{formatCurrency(settlement.profitSettlement)}</div>
                        <p className="text-xs text-gray-500">회사 순익: {formatCurrency(settlement.companyNetProfit)}</p>
                      </CardContent>
                    </Card>
                  )}
                  {dManuals.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                        <CardTitle className="text-xs font-medium">추가 정산</CardTitle>
                        <Calculator className="h-3.5 w-3.5 text-orange-500" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className={`text-lg font-bold ${manualTotal >= 0 ? "text-orange-600" : "text-red-600"}`}>{formatCurrency(manualTotal)}</div>
                        <p className="text-xs text-gray-500">{dManuals.length}건</p>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                      <CardTitle className="text-xs font-medium">총 정산금</CardTitle>
                      <Calculator className="h-3.5 w-3.5 text-primary" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</div>
                    </CardContent>
                  </Card>
                  {totalAdvance > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                        <CardTitle className="text-xs font-medium">가불 차감</CardTitle>
                        <Wallet className="h-3.5 w-3.5 text-red-500" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-lg font-bold text-red-600">- {formatCurrency(totalAdvance)}</div>
                      </CardContent>
                    </Card>
                  )}
                  {totalAdvance > 0 && (
                    <Card className="border-2 border-primary">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                        <CardTitle className="text-xs font-medium">최종 정산금</CardTitle>
                        <Calculator className="h-3.5 w-3.5 text-primary" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className={`text-lg font-bold ${finalTotal >= 0 ? "text-primary" : "text-red-600"}`}>{formatCurrency(finalTotal)}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 순익 계산 과정 */}
                {settlement && settlement.fullPaymentRate > 0 && summary && (
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">순익 계산 과정</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-1 text-sm">
                        <button
                          type="button"
                          className="w-full flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => setShowRevenueDetail(!showRevenueDetail)}
                        >
                          <span className="text-gray-600 flex items-center gap-1">
                            회사 총 매출
                            {showRevenueDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                          <span className="font-medium">{formatCurrency(summary.companyRevenue)}</span>
                        </button>
                        {showRevenueDetail && settlement.revenues.length > 0 && (
                          <div className="ml-4 mb-2 border-l-2 border-green-200 pl-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs py-1">날짜</TableHead>
                                  <TableHead className="text-xs py-1">프로젝트</TableHead>
                                  <TableHead className="text-xs py-1">유형</TableHead>
                                  <TableHead className="text-xs py-1 text-right">금액</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {settlement.revenues.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell className="text-xs py-1">{r.receivedAt ? format(new Date(r.receivedAt), "yyyy-MM-dd") : "-"}</TableCell>
                                    <TableCell className="text-xs py-1">{r.project?.name || "-"}</TableCell>
                                    <TableCell className="text-xs py-1">{paymentTypeLabels[r.type] || r.type}</TableCell>
                                    <TableCell className="text-xs py-1 text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        <button
                          type="button"
                          className="w-full flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                        >
                          <span className="text-gray-600 flex items-center gap-1">
                            (-) 회사 총 매입
                            {showExpenseDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                          <span className="font-medium text-red-600">- {formatCurrency(summary.companyExpense)}</span>
                        </button>
                        {showExpenseDetail && settlement.expenses.length > 0 && (
                          <div className="ml-4 mb-2 border-l-2 border-red-200 pl-3">
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

                        {summary.totalRevenueIncentives > 0 && (
                          <>
                            <button
                              type="button"
                              className="w-full flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                              onClick={() => setShowIncentiveDetail(!showIncentiveDetail)}
                            >
                              <span className="text-gray-600 flex items-center gap-1">
                                (-) 매출 인센티브
                                {showIncentiveDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </span>
                              <span className="font-medium text-red-600">- {formatCurrency(summary.totalRevenueIncentives)}</span>
                            </button>
                            {showIncentiveDetail && summary.revenueIncentiveDetails.length > 0 && (
                              <div className="ml-4 mb-2 border-l-2 border-orange-200 pl-3">
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

                        {summary.totalManualSettlements > 0 && (
                          <div className="flex justify-between py-1.5 px-2">
                            <span className="text-gray-600">(-) 추가 정산금</span>
                            <span className="font-medium text-red-600">- {formatCurrency(summary.totalManualSettlements)}</span>
                          </div>
                        )}

                        <div className="border-t pt-2 flex justify-between px-2">
                          <span className="font-semibold text-gray-900">회사 순익</span>
                          <span className={`font-bold ${summary.companyNetProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(summary.companyNetProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 bg-blue-50 rounded-lg px-3">
                          <span className="text-gray-700">순익 정산 ({settlement.fullPaymentRate}%)</span>
                          <span className="font-bold text-blue-600">{formatCurrency(settlement.profitSettlement)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 추가 정산 내역 */}
                {dManuals.length > 0 && (
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">추가 정산 내역</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">날짜</TableHead>
                            <TableHead className="text-xs">구분</TableHead>
                            <TableHead className="text-xs text-right">금액</TableHead>
                            <TableHead className="text-xs">설명</TableHead>
                            <TableHead className="text-xs">지급</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dManuals.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-xs">{m.targetDate ? format(new Date(m.targetDate), "yyyy-MM-dd") : "-"}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                              <TableCell className={`text-xs text-right font-medium ${m.amount < 0 ? "text-red-600" : ""}`}>{formatCurrency(m.amount)}</TableCell>
                              <TableCell className="text-xs text-gray-500">{m.description || "-"}</TableCell>
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
              </div>
            );
          })() : (
            <p className="text-center text-gray-400 py-8">데이터를 불러올 수 없습니다.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
