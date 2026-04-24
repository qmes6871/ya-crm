import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isDemoUser } from "@/lib/demo";

// 한국 시간대 기준 날짜를 UTC Date 객체로 변환
function getKSTDateAsUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// GET: 전체 직원 출퇴근 기록 조회 (관리자용)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const date = searchParams.get("date"); // 특정 날짜 조회 (yyyy-MM-dd)

    let startDate: Date;
    let endDate: Date;

    if (date) {
      // 특정 날짜 조회 (yyyy-MM-dd 형식)
      const [y, m, d] = date.split("-").map(s => parseInt(s));
      startDate = getKSTDateAsUTC(y, m, d);
      endDate = getKSTDateAsUTC(y, m, d);
    } else {
      // 월별 조회
      startDate = getKSTDateAsUTC(year, month, 1);
      // 해당 월의 마지막 날 계산
      const lastDay = new Date(year, month, 0).getDate();
      endDate = getKSTDateAsUTC(year, month, lastDay);
    }

    // 전체 활성 사용자 조회
    // 데모 계정은 빈 결과 반환
    if (isDemoUser(session)) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    // 해당 기간 출퇴근 기록 조회
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
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
      orderBy: [{ date: "desc" }, { checkIn: "asc" }],
    });

    return NextResponse.json({ users, attendances });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
