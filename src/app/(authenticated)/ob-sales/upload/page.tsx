"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, ExternalLink, UserPlus, Upload, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  NEW: { label: "미통화", className: "bg-gray-100 text-gray-700" },
  REJECTED: { label: "거절", className: "bg-red-100 text-red-700" },
  NO_ANSWER: { label: "부재", className: "bg-yellow-100 text-yellow-700" },
  CALLBACK: { label: "재통", className: "bg-blue-100 text-blue-700" },
  PROSPECT: { label: "가망", className: "bg-purple-100 text-purple-700" },
  DESIGN: { label: "시안제작", className: "bg-indigo-100 text-indigo-700" },
  CONTRACT: { label: "계약", className: "bg-green-100 text-green-700" },
};

interface User { id: string; name: string; }
interface ObLead {
  id: string; phone: string; customerName: string | null; customerLink: string | null;
  memo: string | null; status: string; assignedDate: string | null; assignee: User | null; creator: User;
  callLogs: { id: string }[]; createdAt: string;
}

export default function ObUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

  const [leads, setLeads] = useState<ObLead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // DB 추가
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ phone: "", customerName: "", customerLink: "", memo: "", assigneeId: "", assignedDate: new Date().toISOString().slice(0, 10) });
  const [addLoading, setAddLoading] = useState(false);

  // 대량 업로드
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ customerName: string; phone: string; customerLink: string }[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkLoading, setBulkLoading] = useState(false);

  // 배정
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAssignee !== "all") params.set("assigneeId", filterAssignee);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterDate) params.set("date", filterDate);
      const res = await fetch(`/yacrm/api/ob-leads?${params}`);
      if (res.ok) setLeads(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterAssignee, filterStatus, filterDate]);

  useEffect(() => {
    if (!isAdmin && session) { router.push("/ob-sales/my"); return; }
    fetchLeads();
    fetchUsers();
  }, [fetchLeads, isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/yacrm/api/users");
      if (res.ok) { const d = await res.json(); setUsers(d.map((u: User) => ({ id: u.id, name: u.name }))); }
    } catch (e) { console.error(e); }
  };

  const handleAddLead = async () => {
    if (!addForm.phone.trim()) { alert("전화번호를 입력해주세요."); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/yacrm/api/ob-leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: addForm.phone, customerName: addForm.customerName, customerLink: addForm.customerLink, memo: addForm.memo, assigneeId: addForm.assigneeId || null, assignedDate: addForm.assignedDate || null }),
      });
      if (res.ok) { setAddOpen(false); setAddForm({ phone: "", customerName: "", customerLink: "", memo: "", assigneeId: "", assignedDate: new Date().toISOString().slice(0, 10) }); fetchLeads(); }
    } catch (e) { console.error(e); } finally { setAddLoading(false); }
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    return lines.slice(1).map((line) => {
      const cols: string[] = []; let current = ""; let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === "," && !inQuotes) { cols.push(current.trim()); current = ""; }
        else current += c;
      }
      cols.push(current.trim());
      return { customerName: cols[1] || "", phone: cols[2] || "", customerLink: cols[3] || "" };
    }).filter((r) => r.phone);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkPreview(parseCSV(ev.target?.result as string));
    reader.readAsText(file, "UTF-8");
  };

  const handleBulkUpload = async () => {
    if (bulkPreview.length === 0) { alert("업로드할 데이터가 없습니다."); return; }
    setBulkLoading(true);
    try {
      const res = await fetch("/yacrm/api/ob-leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: bulkPreview.map((r) => ({ ...r, assigneeId: bulkAssigneeId || null, assignedDate: bulkDate || null })) }),
      });
      if (res.ok) { const d = await res.json(); alert(`${d.count}건이 등록되었습니다.`); setBulkOpen(false); setBulkPreview([]); setBulkAssigneeId(""); setBulkDate(new Date().toISOString().slice(0, 10)); fetchLeads(); }
    } catch (e) { console.error(e); alert("업로드에 실패했습니다."); } finally { setBulkLoading(false); }
  };

  const handleAssign = async () => {
    if (!assignUserId) { alert("담당자를 선택해주세요."); return; }
    setAssignLoading(true);
    try {
      const res = await fetch(`/yacrm/api/ob-leads/${assignLeadId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assignUserId }),
      });
      if (res.ok) { setAssignOpen(false); setAssignLeadId(null); setAssignUserId(""); fetchLeads(); }
    } catch (e) { console.error(e); } finally { setAssignLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try { await fetch(`/yacrm/api/ob-leads/${id}`, { method: "DELETE" }); fetchLeads(); } catch (e) { console.error(e); }
  };

  const handleSelectedDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/yacrm/api/ob-leads/${id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      fetchLeads();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const handleDeleteAll = async () => {
    if (leads.length === 0) return;
    if (!confirm(`전체 ${leads.length}건을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      await Promise.all(leads.map((l) => fetch(`/yacrm/api/ob-leads/${l.id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      fetchLeads();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DB 업로드</h1>
          <p className="text-gray-500">OB영업 DB를 등록하고 담당자에게 배정합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={handleSelectedDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {selectedIds.size}건 삭제
            </Button>
          )}
          <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={handleDeleteAll} disabled={deleting || leads.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />전체 삭제
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />대량 업로드
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />DB 추가
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-48">
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger><SelectValue placeholder="담당자" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 담당자</SelectItem>
                  <SelectItem value="unassigned">미배정</SelectItem>
                  {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            {filterDate && (
              <Button variant="ghost" size="sm" onClick={() => setFilterDate("")}>날짜 초기화</Button>
            )}
            <div className="text-sm text-gray-500 flex items-center">총 {leads.length}건</div>
          </div>
        </CardContent>
      </Card>

      {/* 리스트 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400">등록된 DB가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={leads.length > 0 && selectedIds.size === leads.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>링크</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>통화횟수</TableHead>
                    <TableHead>배정일</TableHead>
                    <TableHead className="w-24">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.customerName || "-"}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>
                          {lead.customerLink ? (
                            <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              링크 <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell><Badge className={st.className} variant="secondary">{st.label}</Badge></TableCell>
                        <TableCell>{lead.assignee?.name || <span className="text-red-400">미배정</span>}</TableCell>
                        <TableCell>{lead.callLogs.length}회</TableCell>
                        <TableCell className="text-sm text-gray-500">{lead.assignedDate ? format(new Date(lead.assignedDate), "MM.dd", { locale: ko }) : "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => { setAssignLeadId(lead.id); setAssignUserId(lead.assignee?.id || ""); setAssignOpen(true); }}>
                              <UserPlus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(lead.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DB 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>DB 추가</DialogTitle><DialogDescription>OB영업 DB를 추가합니다.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>배정일</Label><Input type="date" value={addForm.assignedDate} onChange={(e) => setAddForm({ ...addForm, assignedDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>전화번호 <span className="text-red-500">*</span></Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="010-0000-0000" /></div>
            <div className="space-y-2"><Label>고객명</Label><Input value={addForm.customerName} onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })} placeholder="고객명" /></div>
            <div className="space-y-2"><Label>고객 링크</Label><Input value={addForm.customerLink} onChange={(e) => setAddForm({ ...addForm, customerLink: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>메모</Label><Textarea value={addForm.memo} onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })} placeholder="메모" rows={2} /></div>
            <div className="space-y-2">
              <Label>담당자 배정</Label>
              <Select value={addForm.assigneeId} onValueChange={(v) => setAddForm({ ...addForm, assigneeId: v })}>
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={handleAddLead} disabled={addLoading}>{addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 담당자 배정 다이얼로그 */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>담당자 배정</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={assignUserId} onValueChange={setAssignUserId}>
              <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
              <SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>취소</Button>
            <Button onClick={handleAssign} disabled={assignLoading}>{assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "배정"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 대량 업로드 다이얼로그 */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { setBulkOpen(open); if (!open) { setBulkPreview([]); setBulkAssigneeId(""); } }}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader><DialogTitle>대량 업로드</DialogTitle><DialogDescription>CSV 파일을 업로드하세요. (컬럼: 배정날짜, 상호명, 전화번호, 링크)</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>CSV 파일</Label><Input type="file" accept=".csv" onChange={handleBulkFileChange} /></div>
            <div className="space-y-2"><Label>배정일</Label><Input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>담당자 일괄 배정</Label>
              <Select value={bulkAssigneeId} onValueChange={setBulkAssigneeId}>
                <SelectTrigger><SelectValue placeholder="담당자 선택 (선택사항)" /></SelectTrigger>
                <SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <Label>미리보기 ({bulkPreview.length}건)</Label>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>상호명</TableHead><TableHead>전화번호</TableHead><TableHead>링크</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {bulkPreview.slice(0, 50).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{row.customerName}</TableCell>
                          <TableCell className="text-sm">{row.phone}</TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]">{row.customerLink && <a href={row.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{row.customerLink}</a>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {bulkPreview.length > 50 && <p className="text-center text-sm text-gray-400 py-2">...외 {bulkPreview.length - 50}건</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>취소</Button>
            <Button onClick={handleBulkUpload} disabled={bulkLoading || bulkPreview.length === 0}>
              {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{bulkPreview.length}건 업로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
