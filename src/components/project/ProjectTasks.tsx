"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListTodo, Plus, Loader2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string }> = {
  TODO: { label: "할 일", color: "bg-gray-100 text-gray-800" },
  IN_PROGRESS: { label: "진행", color: "bg-blue-100 text-blue-800" },
  REVIEW: { label: "검토", color: "bg-yellow-100 text-yellow-800" },
  COMPLETED: { label: "완료", color: "bg-green-100 text-green-800" },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: "낮음", color: "bg-gray-100 text-gray-600" },
  NORMAL: { label: "보통", color: "bg-blue-100 text-blue-600" },
  HIGH: { label: "높음", color: "bg-orange-100 text-orange-600" },
  URGENT: { label: "긴급", color: "bg-red-100 text-red-600" },
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: Date | null;
  assignee: {
    id: string;
    name: string;
  };
}

interface ProjectTasksProps {
  project: {
    id: string;
    tasks: Task[];
  };
  users: { id: string; name: string; email: string }[];
}

export function ProjectTasks({ project, users }: ProjectTasksProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "NORMAL",
    deadline: "",
  });

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.assigneeId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/crm/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTask,
          projectId: project.id,
          deadline: newTask.deadline || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      setIsAddOpen(false);
      setNewTask({
        title: "",
        description: "",
        assigneeId: "",
        priority: "NORMAL",
        deadline: "",
      });
      router.refresh();
    } catch (error) {
      console.error("Error adding task:", error);
      alert("업무 추가에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/crm/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      router.refresh();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const groupedTasks = {
    TODO: project.tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: project.tasks.filter((t) => t.status === "IN_PROGRESS"),
    REVIEW: project.tasks.filter((t) => t.status === "REVIEW"),
    COMPLETED: project.tasks.filter((t) => t.status === "COMPLETED"),
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            프로젝트 업무
          </CardTitle>
          <CardDescription>
            프로젝트에 연결된 업무를 관리합니다. (개인 업무와 연동됩니다)
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              업무 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>업무 추가</DialogTitle>
              <DialogDescription>새로운 업무를 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="업무 제목"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="업무 설명"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">담당자 *</Label>
                <Select
                  value={newTask.assigneeId}
                  onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
                >
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">마감일</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleAddTask}
                disabled={isLoading || !newTask.title || !newTask.assigneeId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  "추가"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {project.tasks.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">업무가 없습니다</h3>
            <p className="mt-2 text-gray-500">새로운 업무를 추가해주세요.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(groupedTasks).map(([status, tasks]) => (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={statusLabels[status].color}>
                    {statusLabels[status].label}
                  </Badge>
                  <span className="text-sm text-gray-500">{tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-white border rounded-lg shadow-sm space-y-2"
                    >
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {task.assignee.name}
                        </div>
                        <Badge className={priorityLabels[task.priority].color} variant="outline">
                          {priorityLabels[task.priority].label}
                        </Badge>
                      </div>
                      {task.deadline && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.deadline), "MM.dd", { locale: ko })}
                        </div>
                      )}
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
