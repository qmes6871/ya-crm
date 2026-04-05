import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADVANCE_LIMIT_RATE = 1.0; // 정산금의 100%

async function calculateTotalSettlement(userId: string, start: Date, end: Date) {
  const [companyRevenue, companyExpense] = await Promise.all([
    prisma.revenue.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: start, lte: end } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: start, lte: end } },
    }),
  ]);

  const totalCompanyRevenue = companyRevenue._sum.amount || 0;
  const totalCompanyExpense = companyExpense._sum.amount || 0;

  const allUsersWithIncentives = await prisma.user.findMany({
    where: { incentives: { isNot: null } },
    include: { incentives: true },
  });

  let totalRevenueIncentives = 0;
  for (const user of allUsersWithIncentives) {
    if (!user.incentives) continue;
    if (user.incentives.revenueRate > 0) {
      totalRevenueIncentives += totalCompanyRevenue * (user.incentives.revenueRate / 100);
    }
  }

  const manualSettlements = await prisma.settlement.aggregate({
    _sum: { amount: true },
    where: {
      targetDate: { gte: start, lte: end },
      userId: { not: userId },
    },
  });
  const totalManualSettlements = manualSettlements._sum.amount || 0;

  const companyNetProfit = totalCompanyRevenue - totalCompanyExpense - totalRevenueIncentives - totalManualSettlements;

  const targetUser = allUsersWithIncentives.find((u) => u.id === userId);
  if (!targetUser?.incentives) return 0;

  const { revenueRate, fullPaymentRate } = targetUser.incentives;
  const revenueSettlement = revenueRate > 0 ? totalCompanyRevenue * (revenueRate / 100) : 0;
  const profitSettlement = fullPaymentRate > 0 ? companyNetProfit * (fullPaymentRate / 100) : 0;

  return Math.round(revenueSettlement + profitSettlement);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    // 관리자가 아니면 본인 것만
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const advances = await prisma.cashAdvance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(advances);
  } catch (error) {
    console.error("Error fetching cash advances:", error);
    return NextResponse.json(
      { error: "지급 목록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, reason, periodStart, periodEnd } = body;

    if (!amount || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "금액, 정산 시작일, 종료일은 필수입니다." },
        { status: 400 }
      );
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd + "T23:59:59.999Z");

    // 현재 정산금 계산
    const totalSettlement = await calculateTotalSettlement(session.user.id, start, end);

    const maxAdvance = Math.round(totalSettlement * ADVANCE_LIMIT_RATE);

    // 해당 기간 기존 지급 합계 (거절 제외)
    const existingAdvances = await prisma.cashAdvance.aggregate({
      _sum: { amount: true },
      where: {
        userId: session.user.id,
        periodStart: start,
        periodEnd: end,
        status: { notIn: ["REJECTED"] },
      },
    });
    const usedAmount = existingAdvances._sum.amount || 0;
    const remaining = maxAdvance - usedAmount;

    if (parseFloat(amount) > remaining) {
      return NextResponse.json(
        { error: `지급 한도를 초과했습니다. 가능 금액: ${remaining.toLocaleString()}원 (정산금 ${totalSettlement.toLocaleString()}원의 100%)` },
        { status: 400 }
      );
    }

    const advance = await prisma.cashAdvance.create({
      data: {
        userId: session.user.id,
        amount: parseFloat(amount),
        reason: reason || null,
        periodStart: start,
        periodEnd: end,
        settlementSnapshot: totalSettlement,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(advance, { status: 201 });
  } catch (error) {
    console.error("Error creating cash advance:", error);
    return NextResponse.json(
      { error: "지급 신청에 실패했습니다." },
      { status: 500 }
    );
  }
}
