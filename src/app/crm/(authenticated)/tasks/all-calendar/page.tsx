"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Loader2, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  assignee: { id: string; name: string };
}

interface UserType {
  id: string;
  name: string;
  email: string;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-200",
  NORMAL: "bg-blue-200",
  HIGH: "bg-orange-200",
  URGENT: "bg-red-200",
};

const statusLabels: Record<string, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행",
  REVIEW: "검토",
  COMPLETED: "완료",
};

// User colors for visual distinction
const userColors = [
  "border-l-4 border-blue-500",
  "border-l-4 border-green-500",
  "border-l-4 border-purple-500",
  "border-l-4 border-pink-500",
  "border-l-4 border-yellow-500",
  "border-l-4 border-red-500",
  "border-l-4 border-indigo-500",
  "border-l-4 border-teal-500",
];

export default function AllCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("all");

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !assigneeId) {
          setAssigneeId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline: deadline || null,
          assigneeId,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setPriority("NORMAL");
        setDeadline("");
        setIsDialogOpen(false);
        setSelectedDate(null);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDeadline(format(date, "yyyy-MM-dd"));
    setIsDialogOpen(true);
  };

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

  const getUserColorIndex = (userId: string) => {
    const index = users.findIndex(u => u.id === userId);
    return index >= 0 ? index % userColors.length : 0;
  };

  const filteredTasks = filterUser === "all"
    ? tasks
    : tasks.filter(task => task.assignee.id === filterUser);

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(
      (task) => task.deadline && isSameDay(new Date(task.deadline), date)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 캘린더</h1>
          <p className="text-gray-500">모든 팀원의 일정을 확인합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="담당자 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 사용자</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setDeadline(format(new Date(), "yyyy-MM-dd"));
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            일정 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>
              {format(currentDate, "yyyy년 MM월", { locale: ko })}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            오늘
          </Button>
        </CardHeader>
        <CardContent>
          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
              <div
                key={day}
                className={`text-center font-medium py-2 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayTasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayOfWeek = day.getDay();

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                        ? "text-blue-500"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded truncate ${
                          priorityColors[task.priority]
                        } ${userColors[getUserColorIndex(task.assignee.id)]} ${
                          task.status === "COMPLETED" ? "line-through opacity-60" : ""
                        }`}
                        title={`${task.title} (${task.assignee.name} - ${statusLabels[task.status]})`}
                      >
                        <span className="text-[10px] text-gray-600">{task.assignee.name}</span>
                        <div>{task.title}</div>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayTasks.length - 3}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">팀원:</span>
        {users.map((user, index) => (
          <div key={user.id} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${userColors[index % userColors.length].replace('border-l-4', 'bg').replace('border-', 'bg-')}`}></div>
            <span>{user.name}</span>
          </div>
        ))}
      </div>

      {/* Priority Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">우선순위:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-200"></div>
          <span>낮음</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-200"></div>
          <span>보통</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-orange-200"></div>
          <span>높음</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-200"></div>
          <span>긴급</span>
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 일정 추가</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}에 일정을 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">담당자 *</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="업무 제목"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="업무 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">긴급성</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">낮음</SelectItem>
                    <SelectItem value="NORMAL">보통</SelectItem>
                    <SelectItem value="HIGH">높음</SelectItem>
                    <SelectItem value="URGENT">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">데드라인</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedDate(null);
                }}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !assigneeId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "추가"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
