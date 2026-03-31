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
    const companyNetProfit = totalCompanyRevenue - totalCompanyExpense;

    // Get users with incentive settings
    const whereUser: Record<string, unknown> = {
      incentives: { isNot: null },
    };
    if (userId) {
      whereUser.id = userId;
    }

    const users = await prisma.user.findMany({
      where: whereUser,
      include: {
        incentives: true,
      },
    });

    // All revenues in range (for detail display)
    const allRevenues = await prisma.revenue.findMany({
      where: { receivedAt: { gte: start, lte: end } },
      include: {
        project: {
          select: { id: true, name: true, client: { select: { name: true } } },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

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
      });
    }

    return NextResponse.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      companyRevenue: totalCompanyRevenue,
      companyExpense: totalCompanyExpense,
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
