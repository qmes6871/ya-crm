import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Company totals
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

    // 전체 유저의 인센티브 설정 조회 (순익 차감 계산용)
    const allUsersWithIncentives = await prisma.user.findMany({
      where: { incentives: { isNot: null } },
      include: { incentives: true },
    });

    // 매출 기반 인센티브 합계 계산 (순익 차감용) - 항상 전체 유저 대상
    let totalRevenueIncentives = 0;
    const revenueIncentiveDetails: { name: string; rate: number; amount: number }[] = [];
    for (const user of allUsersWithIncentives) {
      if (!user.incentives) continue;
      const { revenueRate } = user.incentives;
      if (revenueRate > 0) {
        const amount = totalCompanyRevenue * (revenueRate / 100);
        totalRevenueIncentives += amount;
        revenueIncentiveDetails.push({
          name: user.name,
          rate: revenueRate,
          amount: Math.round(amount),
        });
      }
    }

    // 결과 반환용 유저 필터
    const users = userId
      ? allUsersWithIncentives.filter((u) => u.id === userId)
      : allUsersWithIncentives;

    // 해당 기간 수동 추가 정산금 합계 (순익 차감용 - 본인 제외)
    const manualSettlementsWhere: Record<string, unknown> = {
      targetDate: { gte: start, lte: end },
    };
    if (userId) {
      manualSettlementsWhere.userId = { not: userId };
    }
    const manualSettlements = await prisma.settlement.aggregate({
      _sum: { amount: true },
      where: manualSettlementsWhere,
    });
    const totalManualSettlements = manualSettlements._sum.amount || 0;

    // 순익 = 총 매출 - 총 매입 - 매출 인센티브 - 수동 정산금(본인 제외)
    const companyNetProfit = totalCompanyRevenue - totalCompanyExpense - totalRevenueIncentives - totalManualSettlements;

    // All revenues in range (for detail display)
    const [allRevenues, allExpenses] = await Promise.all([
      prisma.revenue.findMany({
        where: { receivedAt: { gte: start, lte: end } },
        include: {
          project: {
            select: { id: true, name: true, client: { select: { name: true } } },
          },
        },
        orderBy: { receivedAt: "desc" },
      }),
      prisma.expense.findMany({
        where: { paidAt: { gte: start, lte: end } },
        select: { id: true, category: true, amount: true, description: true, paidAt: true },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const results = [];

    for (const user of users) {
      if (!user.incentives) continue;

      const { revenueRate, fullPaymentRate } = user.incentives;
      if (revenueRate === 0 && fullPaymentRate === 0) continue;

      const revenueSettlement = revenueRate > 0 ? totalCompanyRevenue * (revenueRate / 100) : 0;
      const profitSettlement = fullPaymentRate > 0 ? companyNetProfit * (fullPaymentRate / 100) : 0;

      results.push({
        user: { id: user.id, name: user.name, email: user.email },
        revenueRate,
        fullPaymentRate,
        companyRevenue: totalCompanyRevenue,
        companyNetProfit: Math.round(companyNetProfit),
        revenueSettlement: Math.round(revenueSettlement),
        profitSettlement: Math.round(profitSettlement),
        totalSettlement: Math.round(revenueSettlement + profitSettlement),
        revenues: allRevenues,
        expenses: allExpenses,
      });
    }

    return NextResponse.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      companyRevenue: totalCompanyRevenue,
      companyExpense: totalCompanyExpense,
      totalRevenueIncentives: Math.round(totalRevenueIncentives),
      revenueIncentiveDetails,
      totalManualSettlements: Math.round(totalManualSettlements),
      companyNetProfit: Math.round(companyNetProfit),
      settlements: results,
    });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "정산 데이터를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
