import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

// 한국 시간대 기준 오늘 날짜 (00:00:00)
function getKSTToday(): Date {
  const now = new Date();
  // 한국 시간대로 날짜 문자열 생성
  const kstDateStr = now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const [year, month, day] = kstDateStr.split(". ").map(s => parseInt(s));
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// GET: 출퇴근 기록 조회
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST: 출근/퇴근 기록
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // "checkIn" or "checkOut"

    if (!action || !["checkIn", "checkOut"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = getKSTToday();

    // 오늘 출퇴근 기록 찾기 또는 생성
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
    });

    if (action === "checkIn") {
      if (attendance?.checkIn) {
        return NextResponse.json(
          { error: "이미 오늘 출근 기록이 있습니다.", attendance },
          { status: 400 }
        );
      }

      attendance = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
        update: {
          checkIn: now,
        },
        create: {
          userId: session.user.id,
          date: today,
          checkIn: now,
        },
      });
    } else if (action === "checkOut") {
      if (!attendance?.checkIn) {
        return NextResponse.json(
          { error: "먼저 출근을 해주세요." },
          { status: 400 }
        );
      }

      if (attendance?.checkOut) {
        return NextResponse.json(
          { error: "이미 오늘 퇴근 기록이 있습니다.", attendance },
          { status: 400 }
        );
      }

      attendance = await prisma.attendance.update({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
        data: {
          checkOut: now,
        },
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error recording attendance:", error);
    return NextResponse.json(
      { error: "Failed to record attendance" },
      { status: 500 }
    );
  }
}
