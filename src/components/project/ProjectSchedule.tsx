"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarDays, Plus, Edit, Trash2, Loader2, Play, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "대기",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock className="h-4 w-4" />
  },
  IN_PROGRESS: {
    label: "작업중",
    color: "bg-blue-100 text-blue-700",
    icon: <Play className="h-4 w-4" />
  },
  COMPLETED: {
    label: "완료",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-4 w-4" />
  },
};

interface Schedule {
  id: string;
  stage: string;
  stageName: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  sortOrder: number;
}

interface ProjectScheduleProps {
  project: {
    id: string;
    progress: number;
    schedules: Schedule[];
  };
}

export function ProjectSchedule({ project }: ProjectScheduleProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingScheduleId, setLoadingScheduleId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    stageName: "",
    startDate: "",
    endDate: "",
  });

  const handleAddSchedule = async () => {
    if (!newSchedule.stageName) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/crm/api/projects/${project.id}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageName: newSchedule.stageName,
          startDate: newSchedule.startDate || null,
          endDate: newSchedule.endDate || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to add schedule");

      setIsAddOpen(false);
      setNewSchedule({ stageName: "", startDate: "", endDate: "" });
      router.refresh();
    } catch (error) {
      console.error("Error adding schedule:", error);
      alert("일정 추가에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/schedules/${selectedSchedule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageName: selectedSchedule.stageName,
            startDate: selectedSchedule.startDate,
            endDate: selectedSchedule.endDate,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update schedule");

      setIsEditOpen(false);
      setSelectedSchedule(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("일정 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `/api/projects/${project.id}/schedules/${scheduleId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete schedule");

      router.refresh();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("일정 삭제에 실패했습니다.");
    }
  };

  const handleStatusChange = async (schedule: Schedule, newStatus: string) => {
    setLoadingScheduleId(schedule.id);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/schedules/${schedule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");

      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setLoadingScheduleId(null);
    }
  };

  const completedCount = project.schedules.filter(s => s.status === "COMPLETED").length;
  const totalCount = project.schedules.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            프로젝트 일정
          </CardTitle>
          <CardDescription>
            진행률: {project.progress}% ({completedCount}/{totalCount} 완료)
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              일정 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>일정 추가</DialogTitle>
              <DialogDescription>새로운 일정을 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stageName">단계명 *</Label>
                <Input
                  id="stageName"
                  value={newSchedule.stageName}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, stageName: e.target.value })
                  }
                  placeholder="예: 2차 수정"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newSchedule.startDate}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newSchedule.endDate}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddSchedule} disabled={isLoading || !newSchedule.stageName}>
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
        {project.schedules.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">일정이 없습니다</h3>
            <p className="mt-2 text-gray-500">일정을 추가해주세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {project.schedules.map((schedule, index) => {
              const statusInfo = statusConfig[schedule.status] || statusConfig.PENDING;
              const isLoadingThis = loadingScheduleId === schedule.id;

              return (
                <div
                  key={schedule.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    schedule.status === "COMPLETED"
                      ? "bg-green-50 border-green-200"
                      : schedule.status === "IN_PROGRESS"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-medium text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${schedule.status === "COMPLETED" ? "line-through text-gray-500" : ""}`}>
                          {schedule.stageName}
                        </span>
                        <Badge className={statusInfo.color}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </Badge>
                      </div>
                      {(schedule.startDate || schedule.endDate) && (
                        <div className="text-sm text-gray-500 mt-1">
                          {schedule.startDate &&
                            format(new Date(schedule.startDate), "yyyy.MM.dd", { locale: ko })}
                          {schedule.startDate && schedule.endDate && " ~ "}
                          {schedule.endDate &&
                            format(new Date(schedule.endDate), "yyyy.MM.dd", { locale: ko })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status action buttons */}
                    {schedule.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(schedule, "IN_PROGRESS")}
                        disabled={isLoadingThis}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="mr-1 h-4 w-4" />
                            작업시작
                          </>
                        )}
                      </Button>
                    )}
                    {schedule.status === "IN_PROGRESS" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(schedule, "COMPLETED")}
                        disabled={isLoadingThis}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            작업완료
                          </>
                        )}
                      </Button>
                    )}
                    {schedule.status === "COMPLETED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(schedule, "PENDING")}
                        disabled={isLoadingThis}
                        className="text-gray-500"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "되돌리기"
                        )}
                      </Button>
                    )}

                    {/* Edit/Delete buttons */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSchedule({
                          ...schedule,
                          startDate: schedule.startDate,
                          endDate: schedule.endDate,
                        });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>일정 수정</DialogTitle>
              <DialogDescription>일정 정보를 수정합니다.</DialogDescription>
            </DialogHeader>
            {selectedSchedule && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editStageName">단계명</Label>
                  <Input
                    id="editStageName"
                    value={selectedSchedule.stageName}
                    onChange={(e) =>
                      setSelectedSchedule({
                        ...selectedSchedule,
                        stageName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editStartDate">시작일</Label>
                    <Input
                      id="editStartDate"
                      type="date"
                      value={
                        selectedSchedule.startDate
                          ? format(new Date(selectedSchedule.startDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          startDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEndDate">종료일</Label>
                    <Input
                      id="editEndDate"
                      type="date"
                      value={
                        selectedSchedule.endDate
                          ? format(new Date(selectedSchedule.endDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          endDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdateSchedule} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
