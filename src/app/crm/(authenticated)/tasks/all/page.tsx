"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Loader2, Edit, Trash2, User, FolderKanban } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string };
  creator: { id: string; name: string };
}

interface UserType {
  id: string;
  name: string;
  email: string;
}

const statusColumns = [
  { id: "TODO", label: "할 일", color: "bg-gray-100" },
  { id: "IN_PROGRESS", label: "진행", color: "bg-blue-100" },
  { id: "REVIEW", label: "검토", color: "bg-yellow-100" },
  { id: "COMPLETED", label: "완료", color: "bg-green-100" },
];

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: "낮음", color: "bg-gray-100 text-gray-800" },
  NORMAL: { label: "보통", color: "bg-blue-100 text-blue-800" },
  HIGH: { label: "높음", color: "bg-orange-100 text-orange-800" },
  URGENT: { label: "긴급", color: "bg-red-100 text-red-800" },
};

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("NORMAL");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("TODO");
  const [editAssigneeId, setEditAssigneeId] = useState("");

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
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditDeadline(task.deadline ? task.deadline.split("T")[0] : "");
    setEditStatus(task.status);
    setEditAssigneeId(task.assignee.id);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          deadline: editDeadline || null,
          status: editStatus,
          assigneeId: editAssigneeId,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setSelectedTask(null);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("이 업무를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks(tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ));
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const filteredTasks = filterUser === "all"
    ? tasks
    : tasks.filter(task => task.assignee.id === filterUser);

  const getTasksByStatus = (status: string) =>
    filteredTasks.filter((task) => task.status === status);

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
          <h1 className="text-2xl font-bold text-gray-900">전체 업무</h1>
          <p className="text-gray-500">모든 사용자의 업무를 관리합니다.</p>
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                업무 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 업무 추가</DialogTitle>
                <DialogDescription>새로운 업무를 추가합니다.</DialogDescription>
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
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
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map((column) => (
          <div key={column.id} className={`rounded-lg p-4 ${column.color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{column.label}</h3>
              <Badge variant="secondary">
                {getTasksByStatus(column.id).length}
              </Badge>
            </div>
            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium flex-1">{task.title}</h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditTask(task)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={priorityLabels[task.priority].color}>
                        {priorityLabels[task.priority].label}
                      </Badge>
                      {task.deadline && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.deadline), "MM.dd", { locale: ko })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <User className="h-3 w-3" />
                      {task.assignee.name}
                    </div>
                    {task.project && (
                      <Link
                        href={`/crm/projects/${task.project.id}`}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:underline mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FolderKanban className="h-3 w-3" />
                        {task.project.name}
                      </Link>
                    )}
                    {/* Status change buttons */}
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {statusColumns
                        .filter((s) => s.id !== task.status)
                        .map((s) => (
                          <Button
                            key={s.id}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => updateTaskStatus(task.id, s.id)}
                          >
                            {s.label}
                          </Button>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getTasksByStatus(column.id).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  업무 없음
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 수정</DialogTitle>
            <DialogDescription>업무 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editAssignee">담당자 *</Label>
              <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
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
              <Label htmlFor="editTitle">제목 *</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="업무 제목"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">설명</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="업무 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPriority">긴급성</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
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
                <Label htmlFor="editStatus">상태</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusColumns.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDeadline">데드라인</Label>
              <Input
                id="editDeadline"
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || !editTitle || !editAssigneeId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
