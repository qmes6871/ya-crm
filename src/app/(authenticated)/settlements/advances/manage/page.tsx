"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, X, Banknote, Trash2 } from "lucide-react";
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
  user: { id: string; name: string; email: string };
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

export default function CashAdvanceManagePage() {
  const [advances, setAdvances] = useState<CashAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");

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
      const d = new Date(now);
      const day = d.getDay();
      const diffToSat = day === 6 ? 0 : -(day + 1);
      const start = new Date(d);
      start.setDate(d.getDate() + diffToSat);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setStartDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
      setEndDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
    } else if (type === "lastWeek") {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      const day = d.getDay();
      const diffToSat = day === 6 ? 0 : -(day + 1);
      const start = new Date(d);
      start.setDate(d.getDate() + diffToSat);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setStartDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
      setEndDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
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

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/yacrm/api/cash-advances?${params}`);
      if (res.ok) setAdvances(await res.json());
    } catch (error) {
      console.error("Error fetching advances:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleStatusChange = async (id: string, status: string, rejReason?: string) => {
    try {
      const res = await fetch(`/yacrm/api/cash-advances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectedReason: rejReason }),
      });
      if (res.ok) {
        fetchAdvances();
      } else {
        const data = await res.json();
        alert(data.error || "처리에 실패했습니다.");
      }
    } catch {
      alert("처리에 실패했습니다.");
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingId(id);
    setRejectedReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (rejectingId) {
      handleStatusChange(rejectingId, "REJECTED", rejectedReason);
      setRejectDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/yacrm/api/cash-advances/${id}`, { method: "DELETE" });
      if (res.ok) fetchAdvances();
      else {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">가불 관리</h1>
        <p className="text-gray-500">직원들의 가불 신청을 관리합니다.</p>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="PENDING">대기</SelectItem>
            <SelectItem value="APPROVED">승인</SelectItem>
            <SelectItem value="PAID">지급완료</SelectItem>
            <SelectItem value="REJECTED">거절</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>가불 신청 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {advances.length === 0 ? (
              <p className="text-center text-gray-400 py-8">가불 내역이 없습니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청일</TableHead>
                    <TableHead>신청자</TableHead>
                    <TableHead>정산 기간</TableHead>
                    <TableHead className="text-right">신청 금액</TableHead>
                    <TableHead className="text-right">정산금(신청시)</TableHead>
                    <TableHead className="text-right">한도(40%)</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[180px]">처리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((adv) => (
                    <TableRow key={adv.id}>
                      <TableCell>{format(new Date(adv.createdAt), "yyyy-MM-dd")}</TableCell>
                      <TableCell className="font-medium">{adv.user.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(adv.periodStart), "MM/dd")} ~ {format(new Date(adv.periodEnd), "MM/dd")}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(adv.amount)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatCurrency(adv.settlementSnapshot)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatCurrency(Math.round(adv.settlementSnapshot * 0.4))}</TableCell>
                      <TableCell className="text-gray-500 max-w-[150px] truncate">{adv.reason || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[adv.status] || "secondary"}>
                          {statusLabels[adv.status] || adv.status}
                        </Badge>
                        {adv.status === "REJECTED" && adv.rejectedReason && (
                          <p className="text-xs text-red-500 mt-1">{adv.rejectedReason}</p>
                        )}
                        {adv.paidAt && (
                          <p className="text-xs text-gray-400 mt-1">지급: {format(new Date(adv.paidAt), "MM/dd")}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {adv.status === "PENDING" && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleStatusChange(adv.id, "APPROVED")}>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                승인
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => openRejectDialog(adv.id)}>
                                <X className="h-3.5 w-3.5 mr-1" />
                                거절
                              </Button>
                            </>
                          )}
                          {adv.status === "APPROVED" && (
                            <Button size="sm" variant="outline" className="text-blue-600" onClick={() => handleStatusChange(adv.id, "PAID")}>
                              <Banknote className="h-3.5 w-3.5 mr-1" />
                              지급완료
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(adv.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가불 거절</DialogTitle>
          </DialogHeader>
          <div>
            <Label>거절 사유</Label>
            <Input
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject}>거절</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
