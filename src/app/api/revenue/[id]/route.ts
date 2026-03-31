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
    const { projectId, type, amount, description, receivedAt } = body;

    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        projectId: projectId || null,
        type,
        amount: parseFloat(amount),
        description: description || null,
        receivedAt: receivedAt ? new Date(receivedAt) : null,
      },
      include: {
        project: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(revenue);
  } catch (error) {
    console.error("Error updating revenue:", error);
    return NextResponse.json(
      { error: "매출 수정에 실패했습니다." },
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

    await prisma.revenue.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting revenue:", error);
    return NextResponse.json(
      { error: "매출 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
