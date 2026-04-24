"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";

type MilestoneKind = "first" | "second" | "final";

interface Milestone {
  kind: MilestoneKind;
  date: string;
  label: string;
  completed: boolean;
}

export interface DeadlineProject {
  id: string;
  name: string;
  status: string;
  client: { id: string; name: string };
  manager: { id: string; name: string };
  milestones: Milestone[];
}

interface Props {
  projects: DeadlineProject[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

const milestoneColors: Record<
  MilestoneKind,
  { dot: string; bg: string; text: string; label: string }
> = {
  first: { dot: "bg-blue-500", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "1차" },
  second: { dot: "bg-purple-500", bg: "bg-purple-50 border-purple-200", text: "text-purple-700", label: "2차" },
  final: { dot: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-700", label: "최종" },
};

type FilterKind = "all" | MilestoneKind;

const filterLabels: Record<FilterKind, string> = {
  all: "전체",
  first: "1차 시안",
  second: "2차 시안",
  final: "최종 마감",
};

interface CalendarMilestone extends Milestone {
  projectId: string;
  projectName: string;
  clientName: string;
  managerName: string;
  status: string;
}

export function DashboardDeadlines({ projects }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");

  const allMilestones = useMemo<CalendarMilestone[]>(() => {
    return projects.flatMap((p) =>
      p.milestones
        .filter((m) => filter === "all" || m.kind === filter)
        .map((m) => ({
          ...m,
          projectId: p.id,
          projectName: p.name,
          clientName: p.client.name,
          managerName: p.manager.name,
          status: p.status,
        }))
    );
  }, [projects, filter]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const getMilestonesForDate = (date: Date) =>
    allMilestones.filter((m) => isSameDay(new Date(m.date), date));

  const handleDateClick = (date: Date) => {
    const items = getMilestonesForDate(date);
    if (items.length === 0) return;
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const selectedDateMilestones = selectedDate ? getMilestonesForDate(selectedDate) : [];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          통합 캘린더
        </CardTitle>
        <CardDescription>프로젝트 마일스톤 월간 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(filterLabels) as FilterKind[]).map((k) => {
              const active = filter === k;
              const color = k !== "all" ? milestoneColors[k] : null;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${
                    active
                      ? color
                        ? `${color.bg} ${color.text} border-current`
                        : "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />}
                  {filterLabels[k]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm whitespace-nowrap">
              {format(currentDate, "yyyy년 MM월", { locale: ko })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              오늘
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 mb-1 min-w-[500px]">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 min-w-[500px]">
            {calendarDays.map((day, idx) => {
              const items = getMilestonesForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dow = day.getDay();

              return (
                <div
                  key={idx}
                  className={`min-h-[72px] p-1.5 border rounded text-left transition-colors ${
                    items.length > 0 ? "cursor-pointer hover:bg-gray-50" : ""
                  } ${!isCurrentMonth ? "bg-gray-50" : ""} ${
                    isToday ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      !isCurrentMonth
                        ? "text-gray-400"
                        : dow === 0
                        ? "text-red-500"
                        : dow === 6
                        ? "text-blue-500"
                        : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 2).map((m, i) => {
                      const color = milestoneColors[m.kind];
                      return (
                        <div
                          key={`${m.projectId}-${m.kind}-${i}`}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate ${
                            m.completed
                              ? "bg-gray-100 text-gray-400 line-through"
                              : `${color.bg} ${color.text}`
                          }`}
                          title={`${color.label} — ${m.projectName}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              m.completed ? "bg-gray-300" : color.dot
                            }`}
                          />
                          <span className="truncate">{m.projectName}</span>
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">
                        +{items.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-600">
          {(Object.keys(milestoneColors) as MilestoneKind[]).map((k) => (
            <div key={k} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${milestoneColors[k].dot}`} />
              <span>{milestoneColors[k].label} 시안/마감</span>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
            </DialogTitle>
            <DialogDescription>
              이 날짜의 마일스톤 ({selectedDateMilestones.length}건)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedDateMilestones.map((m, i) => {
              const color = milestoneColors[m.kind];
              const status = statusLabels[m.status] ?? {
                label: m.status,
                color: "bg-gray-100 text-gray-800",
              };
              return (
                <Link
                  key={`${m.projectId}-${m.kind}-${i}`}
                  href={`/projects/${m.projectId}`}
                  onClick={() => setIsDialogOpen(false)}
                  className={`block p-3 rounded-lg border hover:bg-gray-50 ${color.bg}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                      <span className={`text-xs font-medium ${color.text}`}>{color.label}</span>
                      <span className="font-medium truncate">{m.projectName}</span>
                    </div>
                    <Badge className={`${status.color} flex-shrink-0`}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {m.clientName} · {m.managerName}
                    {m.completed && <span className="ml-2 text-emerald-600">· 완료</span>}
                  </p>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
