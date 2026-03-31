import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // 총 매출/매입
    const [totalRevenue, totalExpense] = await Promise.all([
      prisma.revenue.aggregate({
        _sum: { amount: true },
        where: { receivedAt: { gte: start, lte: end } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { paidAt: { gte: start, lte: end } },
      }),
    ]);

    // 범위 내 월별 집계
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();

    const monthly = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      // clamp to the requested range
      const qStart = mStart < start ? start : mStart;
      const qEnd = mEnd > end ? end : mEnd;

      const [rev, exp] = await Promise.all([
        prisma.revenue.aggregate({
          _sum: { amount: true },
          where: { receivedAt: { gte: qStart, lte: qEnd } },
        }),
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: { paidAt: { gte: qStart, lte: qEnd } },
        }),
      ]);

      monthly.push({
        year: y,
        month: m + 1,
        revenue: rev._sum.amount || 0,
        expense: exp._sum.amount || 0,
        profit: (rev._sum.amount || 0) - (exp._sum.amount || 0),
      });

      m++;
      if (m > 11) { m = 0; y++; }
    }

    return NextResponse.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalRevenue: totalRevenue._sum.amount || 0,
      totalExpense: totalExpense._sum.amount || 0,
      netProfit: (totalRevenue._sum.amount || 0) - (totalExpense._sum.amount || 0),
      monthly,
    });
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    return NextResponse.json(
      { error: "요약 데이터를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
