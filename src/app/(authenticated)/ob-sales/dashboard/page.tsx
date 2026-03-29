"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, ExternalLink, ChevronDown, ChevronUp, Send } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; className: string; color: string }> = {
  NEW: { label: "미통화", className: "bg-gray-100 text-gray-700", color: "#9ca3af" },
  REJECTED: { label: "거절", className: "bg-red-100 text-red-700", color: "#ef4444" },
  NO_ANSWER: { label: "부재", className: "bg-yellow-100 text-yellow-700", color: "#eab308" },
  CALLBACK: { label: "재통", className: "bg-blue-100 text-blue-700", color: "#3b82f6" },
  PROSPECT: { label: "가망", className: "bg-purple-100 text-purple-700", color: "#a855f7" },
  DESIGN: { label: "시안제작", className: "bg-indigo-100 text-indigo-700", color: "#6366f1" },
  CONTRACT: { label: "계약", className: "bg-green-100 text-green-700", color: "#22c55e" },
};

interface User { id: string; name: string; }
interface CallLog { id: string; result: string; note: string | null; calledAt: string; caller: User; }
interface ObLead {
  id: string; phone: string; customerName: string | null; customerLink: string | null;
  memo: string | null; status: string;
  assignedDate: string | null; assignee: User | null; creator: User; callLogs: CallLog[]; createdAt: string;
}

const RESULT_OPTIONS = Object.entries(STATUS_CONFIG).filter(([k]) => k !== "NEW");

export default function ObDashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [leads, setLeads] = useState<ObLead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatusKey, setFilterStatusKey] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCallLeadId, setExpandedCallLeadId] = useState<string | null>(null);
  const [callForms, setCallForms] = useState<Record<string, { result: string; note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/crm/api/ob-leads");
      if (res.ok) setLeads(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/crm/api/users");
      if (res.ok) { const d = await res.json(); setUsers(d.map((u: User) => ({ id: u.id, name: u.name }))); }
    } catch (e) { console.error(e); }
  };

  const getCallForm = (leadId: string) => callForms[leadId] || { result: "", note: "" };
  const updateCallForm = (leadId: string, field: "result" | "note", value: string) => {
    setCallForms((prev) => ({ ...prev, [leadId]: { ...getCallForm(leadId), [field]: value } }));
  };
  const handleSaveCall = async (leadId: string) => {
    const form = getCallForm(leadId);
    if (!form.result) { alert("통화 결과를 선택해주세요."); return; }
    setSavingId(leadId);
    try {
      const res = await fetch(`/crm/api/ob-leads/${leadId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callLog: { result: form.result, note: form.note } }),
      });
      if (res.ok) {
        setCallForms((prev) => { const next = { ...prev }; delete next[leadId]; return next; });
        fetchLeads();
      }
    } catch (e) { console.error(e); }
    finally { setSavingId(null); }
  };

  // 날짜 범위 계산
  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const today = startOfDay(new Date());
    switch (dateRange) {
      case "today":
        return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
      case "week":
        return { from: subDays(today, 6), to: new Date(today.getTime() + 86400000 - 1) };
      case "month":
        return { from: subDays(today, 29), to: new Date(today.getTime() + 86400000 - 1) };
      case "custom":
        return {
          from: customFrom ? startOfDay(new Date(customFrom)) : null,
          to: customTo ? new Date(startOfDay(new Date(customTo)).getTime() + 86400000 - 1) : null,
        };
      case "all":
        return { from: null, to: null };
      default:
        return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
    }
  };

  // 기본 필터 (담당자, 날짜, 검색) - 통계용
  const baseFilteredLeads = leads.filter((l) => {
    if (filterAssignee !== "all" && l.assignee?.id !== filterAssignee) return false;
    const { from, to } = getDateRange();
    if (from || to) {
      if (!l.assignedDate) return false;
      const d = new Date(l.assignedDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      const qNum = q.replace(/-/g, "");
      const name = (l.customerName || "").toLowerCase();
      const phone = l.phone.replace(/-/g, "");
      if (!name.includes(q) && !phone.includes(qNum) && !l.phone.includes(q)) return false;
    }
    return true;
  });

  // 상태 필터 적용된 최종 리스트
  const filteredLeads = filterStatusKey
    ? baseFilteredLeads.filter((l) => l.status === filterStatusKey)
    : baseFilteredLeads;

  // 전체 상태별 통계 (상태 필터 전 기준)
  const statusCounts = baseFilteredLeads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const totalCalls = baseFilteredLeads.reduce((sum, l) => sum + l.callLogs.length, 0);

  // 담당자별 통계
  const userStats = baseFilteredLeads.reduce((acc, lead) => {
    const name = lead.assignee?.name || "미배정";
    if (!acc[name]) acc[name] = { total: 0, calls: 0, statuses: {} as Record<string, number> };
    acc[name].total += 1;
    acc[name].calls += lead.callLogs.length;
    acc[name].statuses[lead.status] = (acc[name].statuses[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, { total: number; calls: number; statuses: Record<string, number> }>);

  // 최근 통화 기록
  const recentCalls = filteredLeads
    .flatMap((lead) => lead.callLogs.map((log) => ({ ...log, lead })))
    .sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime())
    .slice(0, searchQuery.length >= 2 ? 100 : 50);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통화결과 대시보드</h1>
          <p className="text-gray-500">OB영업 통화 결과를 한눈에 확인합니다.</p>
        </div>
        <div className="relative w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="고객명, 전화번호 검색" className="pl-9" />
        </div>
      </div>

      {/* 기간 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: "today", label: "오늘" },
              { key: "week", label: "최근 1주일" },
              { key: "month", label: "최근 한달" },
              { key: "all", label: "전체" },
              { key: "custom", label: "날짜 지정" },
            ].map((opt) => (
              <Button
                key={opt.key}
                variant={dateRange === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); if (!customTo || customTo < e.target.value) setCustomTo(e.target.value); }} className="w-36" />
                <span className="text-gray-400">~</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-36" />
              </div>
            )}
            {isAdmin && (
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-40"><SelectValue placeholder="담당자" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 담당자</SelectItem>
                  {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">전체 DB</p>
            <p className="text-3xl font-bold">{filteredLeads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">총 통화</p>
            <p className="text-3xl font-bold text-blue-600">{totalCalls}회</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-green-600">계약</p>
            <p className="text-3xl font-bold text-green-600">{statusCounts["CONTRACT"] || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-purple-600">가망</p>
            <p className="text-3xl font-bold text-purple-600">{statusCounts["PROSPECT"] || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* 상태별 분포 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">상태별 현황</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              const pct = baseFilteredLeads.length > 0 ? Math.round((count / baseFilteredLeads.length) * 100) : 0;
              const isActive = filterStatusKey === key;
              return (
                <div key={key}
                  className={`text-center p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
                  onClick={() => setFilterStatusKey(isActive ? "" : key)}>
                  <Badge className={config.className} variant="secondary">{config.label}</Badge>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-gray-400">{pct}%</p>
                </div>
              );
            })}
          </div>
          {/* 바 차트 */}
          {baseFilteredLeads.length > 0 && (
            <div className="mt-4 flex rounded-lg overflow-hidden h-8">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = statusCounts[key] || 0;
                if (count === 0) return null;
                const pct = (count / baseFilteredLeads.length) * 100;
                return (
                  <div key={key} style={{ width: `${pct}%`, backgroundColor: config.color }} className="flex items-center justify-center text-white text-xs font-medium min-w-[24px]" title={`${config.label}: ${count}건`}>
                    {pct >= 8 ? count : ""}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 담당자별 현황 (관리자) */}
      {isAdmin && Object.keys(userStats).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">담당자별 현황</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>담당자</TableHead>
                    <TableHead className="text-center">전체</TableHead>
                    <TableHead className="text-center">통화수</TableHead>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <TableHead key={k} className="text-center">{v.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(userStats).sort(([, a], [, b]) => b.total - a.total).map(([name, stats]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-center">{stats.total}</TableCell>
                      <TableCell className="text-center font-medium text-blue-600">{stats.calls}</TableCell>
                      {Object.keys(STATUS_CONFIG).map((k) => (
                        <TableCell key={k} className="text-center">{stats.statuses[k] || 0}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상태 필터 DB 목록 */}
      {filterStatusKey && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className={STATUS_CONFIG[filterStatusKey]?.className} variant="secondary">{STATUS_CONFIG[filterStatusKey]?.label}</Badge>
                DB 목록 ({filteredLeads.length}건)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setFilterStatusKey("")}>닫기</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">해당 상태의 DB가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead>담당자</TableHead>
                      <TableHead>배정일</TableHead>
                      <TableHead>통화수</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => {
                      const isExp = expandedId === `status-${lead.id}`;
                      return (
                        <>
                          <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExp ? null : `status-${lead.id}`)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {lead.customerName || "-"}
                                {lead.customerLink && (
                                  <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3 w-3 text-blue-500" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>{lead.phone}</a></TableCell>
                            <TableCell>{lead.assignee?.name || "-"}</TableCell>
                            <TableCell className="text-sm text-gray-500">{lead.assignedDate ? format(new Date(lead.assignedDate), "MM.dd", { locale: ko }) : "-"}</TableCell>
                            <TableCell>{lead.callLogs.length}회</TableCell>
                            <TableCell>{isExp ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</TableCell>
                          </TableRow>
                          {isExp && (
                            <TableRow key={`status-${lead.id}-detail`}>
                              <TableCell colSpan={6} className="bg-gray-50 p-4">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    {lead.customerLink && <div><span className="text-gray-500">링크: </span><a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{lead.customerLink}</a></div>}
                                    {lead.memo && <div><span className="text-gray-500">메모: </span>{lead.memo}</div>}
                                    <div><span className="text-gray-500">등록자: </span>{lead.creator?.name || "-"}</div>
                                  </div>
                                  <div className="space-y-2 p-3 bg-white rounded-lg border">
                                    <p className="text-sm font-medium text-gray-600">통화 기록 작성</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {RESULT_OPTIONS.map(([key, config]) => (
                                        <button key={key} onClick={() => updateCallForm(lead.id, "result", key)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getCallForm(lead.id).result === key ? `${config.className} ring-2 ring-offset-1 ring-gray-400` : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                                          {config.label}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <Textarea value={getCallForm(lead.id).note} onChange={(e) => updateCallForm(lead.id, "note", e.target.value)} placeholder="통화 내용 입력..." rows={1} className="resize-none text-sm min-h-[38px]" />
                                      <Button onClick={() => handleSaveCall(lead.id)} disabled={!getCallForm(lead.id).result || savingId === lead.id} size="sm" className="shrink-0 h-[38px]">
                                        {savingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-gray-600">통화 기록 ({lead.callLogs.length}건)</div>
                                  {lead.callLogs.length === 0 ? (
                                    <p className="text-sm text-gray-400">통화 기록이 없습니다.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {lead.callLogs.map((log) => {
                                        const logSt = STATUS_CONFIG[log.result] || STATUS_CONFIG.NEW;
                                        return (
                                          <div key={log.id} className="p-3 bg-white rounded-lg border text-sm space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Badge className={logSt.className} variant="secondary">{logSt.label}</Badge>
                                              <span className="text-gray-500">{format(new Date(log.calledAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                                              <span className="text-gray-400">({log.caller.name})</span>
                                            </div>
                                            {log.note && <p className="text-gray-700">{log.note}</p>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 검색된 DB 목록 */}
      {searchQuery.length >= 2 && filteredLeads.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">검색된 DB ({filteredLeads.length}건)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>배정일</TableHead>
                    <TableHead>통화수</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                    const isExpanded = expandedId === lead.id;
                    return (
                      <>
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {lead.customerName || "-"}
                              {lead.customerLink && (
                                <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3 text-blue-500" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell><Badge className={st.className} variant="secondary">{st.label}</Badge></TableCell>
                          <TableCell>{lead.assignee?.name || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-500">{lead.assignedDate ? format(new Date(lead.assignedDate), "MM.dd", { locale: ko }) : "-"}</TableCell>
                          <TableCell>{lead.callLogs.length}회</TableCell>
                          <TableCell>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${lead.id}-detail`}>
                            <TableCell colSpan={7} className="bg-gray-50 p-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-4 text-sm">
                                  <div><span className="text-gray-500">전화번호: </span><a href={`tel:${lead.phone}`} className="text-blue-600 font-medium">{lead.phone}</a></div>
                                  {lead.customerLink && (
                                    <div><span className="text-gray-500">링크: </span><a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{lead.customerLink}</a></div>
                                  )}
                                  {lead.memo && <div><span className="text-gray-500">메모: </span>{lead.memo}</div>}
                                  <div><span className="text-gray-500">등록자: </span>{lead.creator?.name || "-"}</div>
                                  <div><span className="text-gray-500">담당자: </span>{lead.assignee?.name || "-"}</div>
                                </div>
                                {/* 통화 기록 입력 */}
                                <div className="space-y-2 p-3 bg-white rounded-lg border">
                                  <p className="text-sm font-medium text-gray-600">통화 기록 작성</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {RESULT_OPTIONS.map(([key, config]) => (
                                      <button key={key} onClick={() => updateCallForm(lead.id, "result", key)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getCallForm(lead.id).result === key ? `${config.className} ring-2 ring-offset-1 ring-gray-400` : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                                        {config.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <Textarea value={getCallForm(lead.id).note} onChange={(e) => updateCallForm(lead.id, "note", e.target.value)} placeholder="통화 내용 입력..." rows={1} className="resize-none text-sm min-h-[38px]" />
                                    <Button onClick={() => handleSaveCall(lead.id)} disabled={!getCallForm(lead.id).result || savingId === lead.id} size="sm" className="shrink-0 h-[38px]">
                                      {savingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-600">통화 기록 ({lead.callLogs.length}건)</div>
                                {lead.callLogs.length === 0 ? (
                                  <p className="text-sm text-gray-400">통화 기록이 없습니다.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {lead.callLogs.map((log) => {
                                      const logSt = STATUS_CONFIG[log.result] || STATUS_CONFIG.NEW;
                                      return (
                                        <div key={log.id} className="p-3 bg-white rounded-lg border text-sm space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={logSt.className} variant="secondary">{logSt.label}</Badge>
                                            <span className="text-gray-500">{format(new Date(log.calledAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                                            <span className="text-gray-400">({log.caller.name})</span>
                                          </div>
                                          {log.note && <p className="text-gray-700">{log.note}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 통화 기록 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{searchQuery.length >= 2 ? "검색된 통화 기록" : "최근 통화 기록"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentCalls.length === 0 ? (
            <div className="text-center py-8 text-gray-400">통화 기록이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>결과</TableHead>
                    <TableHead>내용</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((call) => {
                    const st = STATUS_CONFIG[call.result] || STATUS_CONFIG.NEW;
                    const isCallExpanded = expandedCallLeadId === call.id;
                    const lead = call.lead;
                    return (
                      <>
                        <TableRow key={call.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedCallLeadId(isCallExpanded ? null : call.id)}>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {format(new Date(call.calledAt), "MM.dd HH:mm", { locale: ko })}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {lead.customerName || lead.phone}
                              {lead.customerLink && (
                                <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3 text-blue-500" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{call.caller.name}</TableCell>
                          <TableCell><Badge className={st.className} variant="secondary">{st.label}</Badge></TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{call.note || "-"}</TableCell>
                        </TableRow>
                        {isCallExpanded && (
                          <TableRow key={`${call.id}-detail`}>
                            <TableCell colSpan={5} className="bg-gray-50 p-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-4 text-sm">
                                  <div><span className="text-gray-500">고객명: </span><span className="font-medium">{lead.customerName || "-"}</span></div>
                                  <div><span className="text-gray-500">전화번호: </span><a href={`tel:${lead.phone}`} className="text-blue-600 font-medium">{lead.phone}</a></div>
                                  {lead.customerLink && (
                                    <div><span className="text-gray-500">링크: </span><a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{lead.customerLink}</a></div>
                                  )}
                                  <div><span className="text-gray-500">등록자: </span>{lead.creator?.name || "-"}</div>
                                  <div><span className="text-gray-500">담당자: </span>{lead.assignee?.name || "-"}</div>
                                  <div><span className="text-gray-500">상태: </span><Badge className={(STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW).className} variant="secondary">{(STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW).label}</Badge></div>
                                </div>
                                {/* 통화 기록 입력 */}
                                <div className="space-y-2 p-3 bg-white rounded-lg border">
                                  <p className="text-sm font-medium text-gray-600">통화 기록 작성</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {RESULT_OPTIONS.map(([key, config]) => (
                                      <button key={key} onClick={() => updateCallForm(lead.id, "result", key)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getCallForm(lead.id).result === key ? `${config.className} ring-2 ring-offset-1 ring-gray-400` : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                                        {config.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <Textarea value={getCallForm(lead.id).note} onChange={(e) => updateCallForm(lead.id, "note", e.target.value)} placeholder="통화 내용 입력..." rows={1} className="resize-none text-sm min-h-[38px]" />
                                    <Button onClick={() => handleSaveCall(lead.id)} disabled={!getCallForm(lead.id).result || savingId === lead.id} size="sm" className="shrink-0 h-[38px]">
                                      {savingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-600">전체 통화 기록 ({lead.callLogs.length}건)</div>
                                {lead.callLogs.length === 0 ? (
                                  <p className="text-sm text-gray-400">통화 기록이 없습니다.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {lead.callLogs.map((log) => {
                                      const logSt = STATUS_CONFIG[log.result] || STATUS_CONFIG.NEW;
                                      return (
                                        <div key={log.id} className="p-3 bg-white rounded-lg border text-sm space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={logSt.className} variant="secondary">{logSt.label}</Badge>
                                            <span className="text-gray-500">{format(new Date(log.calledAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                                            <span className="text-gray-400">({log.caller.name})</span>
                                          </div>
                                          {log.note && <p className="text-gray-700">{log.note}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
