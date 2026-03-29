"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Users, Pencil, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  user: User;
}

function formatTime(dateString: string | null) {
  if (!dateString) return "-";
  return format(new Date(dateString), "HH:mm");
}

function formatTimeForInput(dateString: string | null) {
  if (!dateString) return "";
  return format(new Date(dateString), "HH:mm");
}

function calculateWorkMinutes(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  return differenceInMinutes(new Date(checkOut), new Date(checkIn));
}

function formatWorkHours(minutes: number | null) {
  if (minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
}

export default function AttendanceManagementPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAttendance, setDeletingAttendance] = useState<Attendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAttendances = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const dateParam = selectedDate ? `&date=${format(selectedDate, "yyyy-MM-dd")}` : "";
      const response = await fetch(`/crm/api/attendance/all?year=${year}&month=${month}${dateParam}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setAttendances(data.attendances);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, selectedDate]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // 달력 데이터 생성
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getAttendancesForDay = (day: Date) => {
    return attendances.filter(a => isSameDay(new Date(a.date), day));
  };

  const getAttendanceForUser = (userId: string) => {
    if (!selectedDate) return null;
    return attendances.find(a => a.userId === userId && isSameDay(new Date(a.date), selectedDate));
  };

  // 선택된 날짜의 출퇴근 현황
  const selectedDateAttendances = selectedDate
    ? attendances.filter(a => isSameDay(new Date(a.date), selectedDate))
    : [];

  // 통계 계산
  const totalWorkMinutes = selectedDateAttendances.reduce((sum, a) => {
    const mins = calculateWorkMinutes(a.checkIn, a.checkOut);
    return sum + (mins || 0);
  }, 0);

  const checkedInCount = selectedDateAttendances.filter(a => a.checkIn).length;
  const checkedOutCount = selectedDateAttendances.filter(a => a.checkOut).length;

  // Edit handlers
  const handleEditClick = (user: User, attendance: Attendance | null) => {
    setEditingUser(user);
    setEditingAttendance(attendance);
    setEditCheckIn(attendance ? formatTimeForInput(attendance.checkIn) : "");
    setEditCheckOut(attendance ? formatTimeForInput(attendance.checkOut) : "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !selectedDate) return;

    setIsSaving(true);
    try {
      // 시간 문자열을 선택된 날짜와 조합하여 ISO 문자열 생성
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const checkInDateTime = editCheckIn ? new Date(`${dateStr}T${editCheckIn}:00+09:00`).toISOString() : null;
      const checkOutDateTime = editCheckOut ? new Date(`${dateStr}T${editCheckOut}:00+09:00`).toISOString() : null;

      if (editingAttendance) {
        // 기존 기록 수정
        const response = await fetch(`/crm/api/attendance/${editingAttendance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || "수정에 실패했습니다.");
          return;
        }
      } else {
        // 새 기록 생성 (관리자가 직접 추가하는 경우)
        const response = await fetch("/crm/api/attendance/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            date: dateStr,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || "추가에 실패했습니다.");
          return;
        }
      }

      setEditModalOpen(false);
      fetchAttendances();
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (attendance: Attendance) => {
    setDeletingAttendance(attendance);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAttendance) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/crm/api/attendance/${deletingAttendance.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "삭제에 실패했습니다.");
        return;
      }

      setDeleteDialogOpen(false);
      fetchAttendances();
    } catch (error) {
      console.error("Error deleting attendance:", error);
      alert("삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">출퇴근 관리</h1>
        <p className="text-gray-500">전체 직원의 출퇴근 현황을 관리합니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 달력 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">날짜 선택</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[100px] text-center text-sm">
                  {format(currentDate, "yyyy년 MM월", { locale: ko })}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2 min-w-[400px]">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div
                  key={day}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-1 min-w-[400px]">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {days.map((day) => {
                const dayAttendances = getAttendancesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const dayOfWeek = getDay(day);
                const hasAttendance = dayAttendances.length > 0;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`h-10 rounded-lg text-sm font-medium transition-colors relative ${
                      isSelected
                        ? "bg-primary text-white"
                        : isToday
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-gray-100"
                    } ${
                      dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""
                    } ${isSelected ? "!text-white" : ""}`}
                  >
                    {format(day, "d")}
                    {hasAttendance && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 선택된 날짜의 출퇴근 현황 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedDate
                    ? format(selectedDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })
                    : "날짜를 선택하세요"}
                </CardTitle>
                <CardDescription>
                  {selectedDate && (
                    <span>
                      출근 {checkedInCount}명 · 퇴근 {checkedOutCount}명 ·
                      총 근무시간 {formatWorkHours(totalWorkMinutes)}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>왼쪽 달력에서 날짜를 선택하세요</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직원</TableHead>
                    <TableHead className="text-center">출근</TableHead>
                    <TableHead className="text-center">퇴근</TableHead>
                    <TableHead className="text-center">근무시간</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-center w-[100px]">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const attendance = getAttendanceForUser(user.id);
                    const workMinutes = attendance
                      ? calculateWorkMinutes(attendance.checkIn, attendance.checkOut)
                      : null;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {attendance?.checkIn ? (
                            <span className="text-green-600 font-medium">
                              {formatTime(attendance.checkIn)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {attendance?.checkOut ? (
                            <span className="text-red-600 font-medium">
                              {formatTime(attendance.checkOut)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">
                            {formatWorkHours(workMinutes)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {!attendance?.checkIn ? (
                            <Badge variant="outline" className="text-gray-500">미출근</Badge>
                          ) : !attendance?.checkOut ? (
                            <Badge className="bg-blue-100 text-blue-800">근무중</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">퇴근</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditClick(user, attendance || null)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {attendance && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteClick(attendance)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>출퇴근 시간 {editingAttendance ? "수정" : "추가"}</DialogTitle>
            <DialogDescription>
              {editingUser?.name} - {selectedDate && format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">출근 시간</Label>
              <Input
                id="checkIn"
                type="time"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                placeholder="09:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">퇴근 시간</Label>
              <Input
                id="checkOut"
                type="time"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                placeholder="18:00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출퇴근 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingAttendance?.user.name}님의 출퇴근 기록을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
