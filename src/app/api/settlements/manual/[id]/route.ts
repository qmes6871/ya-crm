import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId, category, amount, description, targetDate, isPaid } = body;

    const settlement = await prisma.settlement.update({
      where: { id },
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

    return NextResponse.json(settlement);
  } catch (error) {
    console.error("Error updating manual settlement:", error);
    return NextResponse.json(
      { error: "정산금 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.settlement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting manual settlement:", error);
    return NextResponse.json(
      { error: "정산금 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
