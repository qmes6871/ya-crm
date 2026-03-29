"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";

interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
}

function formatTime(dateString: string | null) {
  if (!dateString) return "-";
  return format(new Date(dateString), "HH:mm:ss");
}

function calculateWorkHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
}

export default function AttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthAttendances, setMonthAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendances = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(`/crm/api/attendance?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setMonthAttendances(data);

        // 오늘 출퇴근 기록 찾기
        const today = new Date();
        const todayRecord = data.find((a: Attendance) =>
          isSameDay(new Date(a.date), today)
        );
        setTodayAttendance(todayRecord || null);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/crm/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkIn" }),
      });
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
        fetchAttendances();
      } else {
        const error = await response.json();
        alert(error.error || "출근 기록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error checking in:", error);
      alert("출근 기록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/crm/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkOut" }),
      });
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
        fetchAttendances();
      } else {
        const error = await response.json();
        alert(error.error || "퇴근 기록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error checking out:", error);
      alert("퇴근 기록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 달력 데이터 생성
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getAttendanceForDay = (day: Date) => {
    return monthAttendances.find(a => isSameDay(new Date(a.date), day));
  };

  const workHours = calculateWorkHours(todayAttendance?.checkIn || null, todayAttendance?.checkOut || null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">출근 / 퇴근</h1>
        <p className="text-gray-500">출퇴근 기록을 관리합니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 오늘 출퇴근 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              오늘의 출퇴근
            </CardTitle>
            <CardDescription>
              {format(new Date(), "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 현재 시간 */}
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">
                {format(currentTime, "HH:mm:ss")}
              </p>
              <p className="text-sm text-gray-500 mt-1">현재 시간</p>
            </div>

            {/* 출퇴근 버튼 */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleCheckIn}
                disabled={isLoading || !!todayAttendance?.checkIn}
                className="h-20 text-lg"
                variant={todayAttendance?.checkIn ? "secondary" : "default"}
              >
                <LogIn className="mr-2 h-6 w-6" />
                출근
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={isLoading || !todayAttendance?.checkIn || !!todayAttendance?.checkOut}
                className="h-20 text-lg"
                variant={todayAttendance?.checkOut ? "secondary" : "outline"}
              >
                <LogOut className="mr-2 h-6 w-6" />
                퇴근
              </Button>
            </div>

            {/* 오늘 출퇴근 기록 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">출근 시간</span>
                <span className="font-semibold text-lg">
                  {todayAttendance?.checkIn
                    ? formatTime(todayAttendance.checkIn)
                    : <span className="text-gray-400">-</span>
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">퇴근 시간</span>
                <span className="font-semibold text-lg">
                  {todayAttendance?.checkOut
                    ? formatTime(todayAttendance.checkOut)
                    : <span className="text-gray-400">-</span>
                  }
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600">근무 시간</span>
                <span className="font-bold text-lg text-primary">
                  {workHours || <span className="text-gray-400">-</span>}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 달력 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>월별 출퇴근 현황</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[120px] text-center">
                  {format(currentDate, "yyyy년 MM월", { locale: ko })}
                </span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2 min-w-[500px]">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-1 min-w-[500px]">
              {/* 빈 칸 */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}

              {/* 날짜 */}
              {days.map((day) => {
                const attendance = getAttendanceForDay(day);
                const isToday = isSameDay(day, new Date());
                const dayOfWeek = getDay(day);
                const dayWorkHours = calculateWorkHours(
                  attendance?.checkIn || null,
                  attendance?.checkOut || null
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={`h-20 p-1 border rounded-lg ${
                      isToday ? "border-primary bg-primary/5" : "border-gray-100"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {attendance && (
                      <div className="text-xs mt-1 space-y-0.5">
                        {attendance.checkIn && (
                          <div className="text-green-600 truncate">
                            {format(new Date(attendance.checkIn), "HH:mm")}
                          </div>
                        )}
                        {attendance.checkOut && (
                          <div className="text-red-600 truncate">
                            {format(new Date(attendance.checkOut), "HH:mm")}
                          </div>
                        )}
                        {dayWorkHours && (
                          <div className="text-primary font-medium truncate text-[10px]">
                            {dayWorkHours}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded" />
                <span>출근</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded" />
                <span>퇴근</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded" />
                <span>근무시간</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
