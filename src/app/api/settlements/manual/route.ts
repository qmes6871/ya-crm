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
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.targetDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }
    if (userId) {
      where.userId = userId;
    }

    const settlements = await prisma.settlement.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { targetDate: "desc" },
    });

    return NextResponse.json(settlements);
  } catch (error) {
    console.error("Error fetching manual settlements:", error);
    return NextResponse.json(
      { error: "수동 정산 목록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, category, amount, description, targetDate, isPaid } = body;

    if (!userId || !category || amount === undefined) {
      return NextResponse.json(
        { error: "직원, 구분, 금액은 필수입니다." },
        { status: 400 }
      );
    }

    const settlement = await prisma.settlement.create({
      data: {
        userId,
        category,
        amount: parseFloat(amount),
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        isPaid: isPaid || false,
        paidAt: isPaid ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    console.error("Error creating manual settlement:", error);
    return NextResponse.json(
      { error: "정산금 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
