"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays, startOfDay } from "date-fns";
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

const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  HIGH: "높음",
  URGENT: "긴급",
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

// D-Day calculation helper
const getDday = (deadline: string) => {
  const today = startOfDay(new Date());
  const deadlineDate = startOfDay(new Date(deadline));
  const diff = differenceInDays(deadlineDate, today);

  if (diff === 0) return { text: "D-Day", color: "text-red-600 font-semibold" };
  if (diff > 0) return { text: `D-${diff}`, color: diff <= 3 ? "text-orange-600" : "text-gray-500" };
  return { text: `D+${Math.abs(diff)}`, color: "text-red-600" };
};

export default function AllCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");

  // Dialog states
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [status, setStatus] = useState("TODO");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  // Edit task
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/yacrm/api/tasks");
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
      const res = await fetch("/yacrm/api/users");
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
      const res = await fetch("/yacrm/api/tasks", {
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
        resetForm();
        setIsAddDialogOpen(false);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/yacrm/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          deadline: deadline || null,
          assigneeId,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingTask(null);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (!confirm("정말 이 업무를 삭제하시겠습니까?")) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/yacrm/api/tasks/${editingTask.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingTask(null);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("NORMAL");
    setStatus("TODO");
    setDeadline("");
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDeadline(format(date, "yyyy-MM-dd"));
    setIsDateDialogOpen(true);
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd") : "");
    setAssigneeId(task.assignee.id);
    setIsEditDialogOpen(true);
  };

  const handleAddFromDateDialog = () => {
    setIsDateDialogOpen(false);
    setIsAddDialogOpen(true);
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

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

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
            setIsAddDialogOpen(true);
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
        <CardContent className="overflow-x-auto">
          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 mb-2 min-w-[500px]">
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
          <div className="grid grid-cols-7 gap-1 min-w-[500px]">
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
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                          priorityColors[task.priority]
                        } ${userColors[getUserColorIndex(task.assignee.id)]} ${
                          task.status === "COMPLETED" ? "line-through opacity-60" : ""
                        }`}
                        title={`${task.title} (${task.assignee.name} - ${statusLabels[task.status]})`}
                        onClick={(e) => handleTaskClick(e, task)}
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

      {/* Date Tasks Dialog - Shows all tasks for selected date */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
            </DialogTitle>
            <DialogDescription>
              이 날짜의 모든 일정입니다. ({selectedDateTasks.length}개)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedDateTasks.length === 0 ? (
              <p className="text-center text-gray-500 py-4">이 날짜에 일정이 없습니다.</p>
            ) : (
              selectedDateTasks.map((task) => {
                const dday = task.deadline ? getDday(task.deadline) : null;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      priorityColors[task.priority]
                    } ${userColors[getUserColorIndex(task.assignee.id)]}`}
                    onClick={() => {
                      setIsDateDialogOpen(false);
                      handleTaskClick({ stopPropagation: () => {} } as React.MouseEvent, task);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{task.title}</span>
                      <div className="flex items-center gap-2">
                        {dday && (
                          <span className={`text-xs ${dday.color}`}>{dday.text}</span>
                        )}
                        <Badge variant={task.status === "COMPLETED" ? "secondary" : "outline"} className="text-xs">
                          {statusLabels[task.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{task.assignee.name}</span>
                      <span>•</span>
                      <span>{priorityLabels[task.priority]}</span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>
              닫기
            </Button>
            <Button onClick={handleAddFromDateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              일정 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                  setIsAddDialogOpen(false);
                  resetForm();
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

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정 수정</DialogTitle>
            <DialogDescription>
              일정 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-assignee">담당자 *</Label>
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
              <Label htmlFor="edit-title">제목 *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="업무 제목"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="업무 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">상태</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">할 일</SelectItem>
                    <SelectItem value="IN_PROGRESS">진행</SelectItem>
                    <SelectItem value="REVIEW">검토</SelectItem>
                    <SelectItem value="COMPLETED">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">긴급성</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline">데드라인</Label>
              <Input
                id="edit-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteTask}
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingTask(null);
                    resetForm();
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
                    "저장"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
