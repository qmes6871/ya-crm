"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, ChevronDown, ChevronUp, Send, ArrowLeft, Search } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
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

const RESULT_OPTIONS = Object.entries(STATUS_CONFIG).filter(([k]) => k !== "NEW");

interface User { id: string; name: string; }
interface CallLog { id: string; result: string; note: string | null; calledAt: string; caller: User; }
interface ObLead {
  id: string; phone: string; customerName: string | null; customerLink: string | null;
  memo: string | null; status: string; assignedDate: string | null; assignee: User | null; callLogs: CallLog[]; createdAt: string;
}

// 오늘 기준 -30일 ~ +7일 날짜 배열 생성
function generateDateRange(): string[] {
  const today = startOfDay(new Date());
  const dates: string[] = [];
  for (let i = -30; i <= 1; i++) {
    dates.push(format(addDays(today, i), "yyyy-MM-dd"));
  }
  return dates;
}

export default function ObMyPage() {
  const [allLeads, setAllLeads] = useState<ObLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [callForms, setCallForms] = useState<Record<string, { result: string; note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const dateRange = useMemo(() => generateDateRange(), []);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/crm/api/ob-leads?mine=true");
      if (res.ok) setAllLeads(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);


  // 날짜별 DB 건수 집계
  const dateCountMap = useMemo(() => {
    const map: Record<string, { total: number; statuses: Record<string, number> }> = {};
    allLeads.forEach((l) => {
      if (l.assignedDate) {
        const d = new Date(l.assignedDate).toISOString().slice(0, 10);
        if (!map[d]) map[d] = { total: 0, statuses: {} };
        map[d].total += 1;
        map[d].statuses[l.status] = (map[d].statuses[l.status] || 0) + 1;
      }
    });
    return map;
  }, [allLeads]);

  // 선택된 날짜의 DB 목록
  const leads = useMemo(() => {
    if (!selectedDate) return [];
    return allLeads.filter((l) => {
      if (!l.assignedDate) return false;
      const d = new Date(l.assignedDate).toISOString().slice(0, 10);
      if (d !== selectedDate) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (l.customerName || "").toLowerCase();
        const phone = l.phone.replace(/-/g, "");
        const query = q.replace(/-/g, "");
        if (!name.includes(q) && !phone.includes(query) && !l.phone.includes(q)) return false;
      }
      return true;
    });
  }, [allLeads, selectedDate, filterStatus, searchQuery]);

  // 전역 검색 결과
  const globalSearchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return [];
    const q = globalSearch.toLowerCase();
    const qNum = q.replace(/-/g, "");
    return allLeads.filter((l) => {
      const name = (l.customerName || "").toLowerCase();
      const phone = l.phone.replace(/-/g, "");
      return name.includes(q) || phone.includes(qNum) || l.phone.includes(q);
    });
  }, [allLeads, globalSearch]);

  // 선택된 날짜의 상태별 통계
  const statusCounts = useMemo(() => {
    if (!selectedDate) return {} as Record<string, number>;
    return allLeads
      .filter((l) => l.assignedDate && new Date(l.assignedDate).toISOString().slice(0, 10) === selectedDate)
      .reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  }, [allLeads, selectedDate]);

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  // 날짜 목록 뷰
  if (!selectedDate) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 DB 확인</h1>
          <p className="text-gray-500">날짜를 선택하거나 검색하여 배정된 DB를 확인하세요.</p>
        </div>

        {/* 전역 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="고객명, 전화번호로 검색 (2글자 이상)"
            className="pl-9"
          />
        </div>

        {/* 검색 결과 */}
        {globalSearch.length >= 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">검색 결과 {globalSearchResults.length}건</p>
            {globalSearchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">검색 결과가 없습니다.</div>
            ) : (
              globalSearchResults.map((lead) => {
                const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                const lastCall = lead.callLogs[0];
                const isExpanded = expandedId === lead.id;
                const form = getCallForm(lead.id);
                const isSaving = savingId === lead.id;

                return (
                  <Card key={lead.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 truncate">{lead.customerName || "이름없음"}</span>
                            <Badge className={st.className} variant="secondary">{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                            {lead.assignedDate && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {format(new Date(lead.assignedDate), "MM/dd", { locale: ko })}
                              </span>
                            )}
                            <a href={`tel:${lead.phone}`} className="text-blue-600 font-medium hover:underline">{lead.phone}</a>
                            {lead.customerLink && (
                              <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                링크 <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {lastCall && (
                              <span className="text-xs text-gray-400">최근: {format(new Date(lastCall.calledAt), "MM.dd HH:mm", { locale: ko })}</span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                          통화이력 {lead.callLogs.length}건
                          {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                        <div className="flex gap-2 flex-wrap">
                          {RESULT_OPTIONS.map(([key, config]) => (
                            <button key={key} onClick={() => updateCallForm(lead.id, "result", key)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.result === key ? `${config.className} ring-2 ring-offset-1 ring-gray-400` : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                              {config.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Textarea value={form.note} onChange={(e) => updateCallForm(lead.id, "note", e.target.value)} placeholder="통화 내용 입력..." rows={1} className="resize-none text-sm min-h-[38px]" />
                        <Button onClick={() => handleSaveCall(lead.id)} disabled={!form.result || isSaving} size="sm" className="shrink-0 h-[38px]">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                      {isExpanded && (
                        <div className="pt-3 border-t space-y-2">
                          {lead.callLogs.length === 0 ? (
                            <p className="text-sm text-gray-400">통화 기록이 없습니다.</p>
                          ) : (
                            <div className="space-y-2">
                              {lead.callLogs.map((log) => {
                                const logSt = STATUS_CONFIG[log.result] || STATUS_CONFIG.NEW;
                                return (
                                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className={logSt.className} variant="secondary">{logSt.label}</Badge>
                                      <span className="text-gray-500">{format(new Date(log.calledAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                                    </div>
                                    {log.note && <p className="text-gray-700">{log.note}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
        /* 날짜 리스트 */
        <div className="space-y-2">
          {dateRange.slice().reverse().map((date) => {
            const counts = dateCountMap[date];
            const isToday = date === todayStr;
            const dayOfWeek = format(new Date(date), "EEE", { locale: ko });
            const isSunday = new Date(date).getDay() === 0;
            const isSaturday = new Date(date).getDay() === 6;

            return (
              <Card
                key={date}
                className={`cursor-pointer hover:shadow-md transition-all ${isToday ? "ring-2 ring-blue-500" : ""} ${!counts ? "opacity-50" : ""}`}
                onClick={() => counts && setSelectedDate(date)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-center w-16 ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : ""}`}>
                        <p className="text-lg font-bold">{format(new Date(date), "MM.dd")}</p>
                        <p className="text-xs text-gray-500">{dayOfWeek}</p>
                      </div>
                      {isToday && <Badge className="bg-blue-500 text-white">오늘</Badge>}
                    </div>
                    <div className="text-right">
                      {counts ? (
                        <><span className="text-sm text-gray-500">총 배정 </span><span className="text-lg font-bold">{counts.total}</span><span className="text-sm text-gray-500">건</span></>
                      ) : (
                        <span className="text-sm text-gray-400">DB 없음</span>
                      )}
                    </div>
                  </div>
                  {counts && Object.keys(counts.statuses).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-[76px]">
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                        const cnt = counts.statuses[key];
                        if (!cnt) return null;
                        return (
                          <span key={key} className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                            {config.label} {cnt}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </div>
    );
  }

  // DB 목록 뷰
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedDate(null); setFilterStatus("all"); setSearchQuery(""); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {format(new Date(selectedDate), "MM월 dd일 (EEE)", { locale: ko })}
          </h1>
          <p className="text-gray-500">배정된 DB를 확인하고 통화 기록을 남깁니다.</p>
        </div>
      </div>

      {/* 상태별 통계 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Card key={key} className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === key ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">{config.label}</p>
              <p className="text-xl font-bold">{statusCounts[key] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="고객명, 전화번호 검색"
            className="pl-9"
          />
        </div>
        {filterStatus !== "all" && (
          <Badge className={STATUS_CONFIG[filterStatus]?.className} variant="secondary">
            {STATUS_CONFIG[filterStatus]?.label} 필터 적용중
          </Badge>
        )}
        <span className="text-sm text-gray-500">총 {leads.length}건</span>
      </div>

      {/* DB 리스트 */}
      {leads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filterStatus !== "all" ? "해당 상태의 DB가 없습니다." : "이 날짜에 배정된 DB가 없습니다."}
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
            const lastCall = lead.callLogs[0];
            const isExpanded = expandedId === lead.id;
            const form = getCallForm(lead.id);
            const isSaving = savingId === lead.id;

            return (
              <Card key={lead.id}>
                <CardContent className="p-4 space-y-3">
                  {/* 고객 정보 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{lead.customerName || "이름없음"}</span>
                        <Badge className={st.className} variant="secondary">{st.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                        <a href={`tel:${lead.phone}`} className="text-blue-600 font-medium hover:underline">{lead.phone}</a>
                        {lead.customerLink && (
                          <a href={lead.customerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                            링크 <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {lastCall && (
                          <span className="text-xs text-gray-400">
                            최근: {format(new Date(lastCall.calledAt), "MM.dd HH:mm", { locale: ko })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                      통화이력 {lead.callLogs.length}건
                      {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                    </Button>
                  </div>

                  {/* 인라인 통화 기록 입력 */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <div className="flex gap-2 flex-wrap">
                      {RESULT_OPTIONS.map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => updateCallForm(lead.id, "result", key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            form.result === key
                              ? `${config.className} ring-2 ring-offset-1 ring-gray-400`
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={form.note}
                      onChange={(e) => updateCallForm(lead.id, "note", e.target.value)}
                      placeholder="통화 내용 입력..."
                      rows={1}
                      className="resize-none text-sm min-h-[38px]"
                    />
                    <Button
                      onClick={() => handleSaveCall(lead.id)}
                      disabled={!form.result || isSaving}
                      size="sm"
                      className="shrink-0 h-[38px]"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* 확장: 통화 이력 */}
                  {isExpanded && (
                    <div className="pt-3 border-t space-y-2">
                      {lead.memo && (
                        <p className="text-sm text-gray-600"><span className="font-medium">메모:</span> {lead.memo}</p>
                      )}
                      {lead.callLogs.length === 0 ? (
                        <p className="text-sm text-gray-400">통화 기록이 없습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {lead.callLogs.map((log) => {
                            const logSt = STATUS_CONFIG[log.result] || STATUS_CONFIG.NEW;
                            return (
                              <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={logSt.className} variant="secondary">{logSt.label}</Badge>
                                  <span className="text-gray-500">{format(new Date(log.calledAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                                </div>
                                {log.note && <p className="text-gray-700">{log.note}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
