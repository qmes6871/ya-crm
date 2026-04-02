"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TrendingUp, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const paymentTypeLabels: Record<string, string> = {
  ADVANCE: "선수금",
  MID_PAYMENT: "중도금",
  BALANCE: "잔금",
  FULL_PAYMENT: "전체지급",
};

interface Project {
  id: string;
  name: string;
  client: { id: string; name: string } | null;
}

interface Revenue {
  id: string;
  projectId: string | null;
  project: Project | null;
  type: string;
  amount: number;
  description: string | null;
  receivedAt: string | null;
  createdAt: string;
}

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

export default function IncomePage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  });

  const [form, setForm] = useState({
    projectId: "",
    type: "FULL_PAYMENT",
    amount: "",
    description: "",
    receivedAt: "",
  });

  const fetchRevenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/yacrm/api/revenue?${params}`);
      if (res.ok) setRevenues(await res.json());
    } catch (error) {
      console.error("Error fetching revenues:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/yacrm/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  useEffect(() => {
    fetchRevenues();
    fetchProjects();
  }, [fetchRevenues]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ projectId: "", type: "FULL_PAYMENT", amount: "", description: "", receivedAt: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: Revenue) => {
    setEditingId(r.id);
    setForm({
      projectId: r.projectId || "",
      type: r.type,
      amount: r.amount.toString(),
      description: r.description || "",
      receivedAt: r.receivedAt ? r.receivedAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.type || !form.amount || !form.receivedAt) {
      alert("유형, 금액, 입금일은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/yacrm/api/revenue/${editingId}` : "/yacrm/api/revenue";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchRevenues();
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
      const res = await fetch(`/yacrm/api/revenue/${id}`, { method: "DELETE" });
      if (res.ok) fetchRevenues();
      else alert("삭제에 실패했습니다.");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const totalAmount = revenues.reduce((sum, r) => sum + r.amount, 0);

  const setQuickRange = (type: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    if (type === "thisMonth") {
      setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
      setEndDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
    } else if (type === "lastMonth") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-01`);
      setEndDate(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
    } else if (type === "thisYear") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 관리</h1>
          <p className="text-gray-500">매출을 확인하고 추가합니다.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          매출 추가
        </Button>
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
          <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>전체</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            매출 목록
          </CardTitle>
          <CardDescription>
            총 {revenues.length}건 | 합계: {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : revenues.length === 0 ? (
            <p className="text-center text-gray-400 py-8">등록된 매출이 없습니다.</p>
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
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.receivedAt ? format(new Date(r.receivedAt), "yyyy-MM-dd") : "-"}
                    </TableCell>
                    <TableCell>{r.project?.name || "-"}</TableCell>
                    <TableCell>{r.project?.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paymentTypeLabels[r.type] || r.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate text-right">
                      {r.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "매출 수정" : "매출 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>프로젝트 (선택)</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="프로젝트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">프로젝트 없음</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.client ? `(${p.client.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>유형 *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>입금일 *</Label>
              <Input
                type="date"
                value={form.receivedAt}
                onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="설명을 입력하세요"
              />
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
    </div>
  );
}
