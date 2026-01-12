import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST: 관리자가 출퇴근 기록 직접 추가
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, date, checkIn, checkOut } = body;

    if (!userId || !date) {
      return NextResponse.json(
        { error: "사용자와 날짜는 필수입니다." },
        { status: 400 }
      );
    }

    // 날짜 변환 (한국 시간대 기준)
    const attendanceDate = new Date(date + "T00:00:00+09:00");
    // UTC로 변환하여 저장
    const utcDate = new Date(Date.UTC(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
      0, 0, 0, 0
    ));

    // 기존 기록 확인
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: utcDate,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "해당 날짜에 이미 출퇴근 기록이 있습니다." },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: utcDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    );
  }
}
