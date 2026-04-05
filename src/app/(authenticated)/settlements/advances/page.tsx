"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface CashAdvance {
  id: string;
  amount: number;
  reason: string | null;
  status: string;
  periodStart: string;
  periodEnd: string;
  settlementSnapshot: number;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
}

interface LimitInfo {
  totalSettlement: number;
  maxAdvance: number;
  usedAmount: number;
  remaining: number;
}

const statusLabels: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "거절",
  PAID: "지급완료",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "outline",
  REJECTED: "destructive",
  PAID: "default",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

function formatNumberWithCommas(value: string) {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("ko-KR").format(parseInt(num));
}

function parseFormattedNumber(value: string) {
  return value.replace(/,/g, "");
}

function getThisMonthRange() {
  const d = new Date();
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
}

export default function CashAdvancePage() {
  const { data: session } = useSession();
  const [advances, setAdvances] = useState<CashAdvance[]>([]);
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [periodStart, setPeriodStart] = useState(() => getThisMonthRange().start);
  const [periodEnd, setPeriodEnd] = useState(() => getThisMonthRange().end);
  const [form, setForm] = useState({ amount: "", reason: "" });

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [advRes, limitRes] = await Promise.all([
        fetch(`/yacrm/api/cash-advances?userId=${session.user.id}`),
        fetch(`/yacrm/api/cash-advances/limit?periodStart=${periodStart}&periodEnd=${periodEnd}`),
      ]);

      if (advRes.ok) setAdvances(await advRes.json());
      if (limitRes.ok) setLimitInfo(await limitRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, periodStart, periodEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async () => {
    if (!form.amount) {
      alert("금액을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/yacrm/api/cash-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFormattedNumber(form.amount),
          reason: form.reason,
          periodStart,
          periodEnd,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ amount: "", reason: "" });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "지급 신청에 실패했습니다.");
      }
    } catch {
      alert("지급 신청에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("지급 신청을 취소하시겠습니까?")) return;
    try {
      const res = await fetch(`/yacrm/api/cash-advances/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("취소에 실패했습니다.");
    } catch {
      alert("취소에 실패했습니다.");
    }
  };

  const setQuickRange = (type: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (type === "thisMonth") {
      setPeriodStart(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setPeriodEnd(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`);
    } else if (type === "lastMonth") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setPeriodStart(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`);
      setPeriodEnd(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate())}`);
    } else if (type === "thisYear") {
      setPeriodStart(`${now.getFullYear()}-01-01`);
      setPeriodEnd(`${now.getFullYear()}-12-31`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 지급 현황</h1>
          <p className="text-gray-500">정산금의 100%까지 지급 신청이 가능합니다.</p>
        </div>
        <Button onClick={() => { setForm({ amount: "", reason: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          지급 신청
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-[160px]" />
        <span className="text-gray-400">~</span>
        <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-[160px]" />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {limitInfo && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">내 정산금</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(limitInfo.totalSettlement)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">지급 한도 (100%)</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(limitInfo.maxAdvance)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">사용 금액</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(limitInfo.usedAmount)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">잔여 한도</CardTitle>
                  <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${limitInfo.remaining > 0 ? "text-primary" : "text-red-600"}`}>
                    {formatCurrency(limitInfo.remaining)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>지급 신청 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {advances.length === 0 ? (
                <p className="text-center text-gray-400 py-8">지급 내역이 없습니다.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신청일</TableHead>
                      <TableHead>정산 기간</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((adv) => (
                      <TableRow key={adv.id}>
                        <TableCell>{format(new Date(adv.createdAt), "yyyy-MM-dd")}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(adv.periodStart), "MM/dd")} ~ {format(new Date(adv.periodEnd), "MM/dd")}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(adv.amount)}</TableCell>
                        <TableCell className="text-gray-500 max-w-[200px] truncate">{adv.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[adv.status] || "secondary"}>
                            {statusLabels[adv.status] || adv.status}
                          </Badge>
                          {adv.status === "REJECTED" && adv.rejectedReason && (
                            <p className="text-xs text-red-500 mt-1">{adv.rejectedReason}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {adv.status === "PENDING" && (
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleCancel(adv.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지급 신청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {limitInfo && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                <p>정산금: <span className="font-medium">{formatCurrency(limitInfo.totalSettlement)}</span></p>
                <p>지급 한도 (100%): <span className="font-medium">{formatCurrency(limitInfo.maxAdvance)}</span></p>
                <p>잔여 한도: <span className="font-bold text-blue-600">{formatCurrency(limitInfo.remaining)}</span></p>
              </div>
            )}
            <div>
              <Label>정산 기간</Label>
              <p className="text-sm text-gray-500 mt-1">{periodStart} ~ {periodEnd}</p>
            </div>
            <div>
              <Label>금액 *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberWithCommas(form.amount)}
                onChange={(e) => setForm({ ...form, amount: parseFormattedNumber(e.target.value) })}
                placeholder="금액을 입력하세요"
              />
            </div>
            <div>
              <Label>사유</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="사유를 입력하세요 (선택)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleRequest} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
