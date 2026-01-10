"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, AlertCircle, Loader2 } from "lucide-react";
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

export default function PersonalTasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks?personal=true");
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

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

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
          <h1 className="text-2xl font-bold text-gray-900">개인 업무</h1>
          <p className="text-gray-500">내 업무를 관리합니다.</p>
        </div>
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
                <Button type="submit" disabled={isSubmitting || !title}>
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
                    <h4 className="font-medium mb-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
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
                    {task.project && (
                      <p className="text-xs text-primary mt-2">
                        {task.project.name}
                      </p>
                    )}
                    {/* Status change buttons */}
                    <div className="mt-3 flex gap-1">
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
    </div>
  );
}
