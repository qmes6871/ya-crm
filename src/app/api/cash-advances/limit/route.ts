import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADVANCE_LIMIT_RATE = 1.0;

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
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");
    const targetUserId = searchParams.get("userId") || session.user.id;

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "기간은 필수입니다." }, { status: 400 });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd + "T23:59:59.999Z");

    const totalSettlement = await calculateTotalSettlement(targetUserId, start, end);
    const maxAdvance = Math.round(totalSettlement * ADVANCE_LIMIT_RATE);

    const existingAdvances = await prisma.cashAdvance.aggregate({
      _sum: { amount: true },
      where: {
        userId: targetUserId,
        periodStart: start,
        periodEnd: end,
        status: { notIn: ["REJECTED"] },
      },
    });
    const usedAmount = existingAdvances._sum.amount || 0;

    return NextResponse.json({
      totalSettlement,
      maxAdvance,
      usedAmount: Math.round(usedAmount),
      remaining: Math.round(maxAdvance - usedAmount),
    });
  } catch (error) {
    console.error("Error calculating advance limit:", error);
    return NextResponse.json(
      { error: "지급 한도 계산에 실패했습니다." },
      { status: 500 }
    );
  }
}
