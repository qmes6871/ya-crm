"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import { format, isSameDay, differenceInMinutes } from "date-fns";
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

export function DashboardAttendance() {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const response = await fetch(`/api/attendance?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        const today = new Date();
        const todayRecord = data.find((a: Attendance) =>
          isSameDay(new Date(a.date), today)
        );
        setTodayAttendance(todayRecord || null);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkIn" }),
      });
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
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
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkOut" }),
      });
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
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

  const workHours = calculateWorkHours(
    todayAttendance?.checkIn || null,
    todayAttendance?.checkOut || null
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          오늘의 출퇴근
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 시간 */}
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-sm text-gray-500">
            {format(currentTime, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
          </p>
        </div>

        {/* 출퇴근 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={isLoading || !!todayAttendance?.checkIn}
            className="h-12"
            variant={todayAttendance?.checkIn ? "secondary" : "default"}
          >
            <LogIn className="mr-2 h-4 w-4" />
            출근
          </Button>
          <Button
            onClick={handleCheckOut}
            disabled={isLoading || !todayAttendance?.checkIn || !!todayAttendance?.checkOut}
            className="h-12"
            variant={todayAttendance?.checkOut ? "secondary" : "outline"}
          >
            <LogOut className="mr-2 h-4 w-4" />
            퇴근
          </Button>
        </div>

        {/* 출퇴근 기록 */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">출근</span>
            <span className="font-medium">
              {todayAttendance?.checkIn ? (
                <span className="text-green-600">{formatTime(todayAttendance.checkIn)}</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">퇴근</span>
            <span className="font-medium">
              {todayAttendance?.checkOut ? (
                <span className="text-red-600">{formatTime(todayAttendance.checkOut)}</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600">근무시간</span>
            <span className="font-bold text-primary">
              {workHours || <span className="text-gray-400 font-normal">-</span>}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
