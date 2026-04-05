import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectedReason } = body;

    const existing = await prisma.cashAdvance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "지급 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    const data: Record<string, unknown> = { status };

    if (status === "APPROVED") {
      data.approvedBy = session.user.id;
      data.approvedAt = new Date();
    } else if (status === "PAID") {
      data.paidAt = new Date();
      if (!existing.approvedBy) {
        data.approvedBy = session.user.id;
        data.approvedAt = new Date();
      }
    } else if (status === "REJECTED") {
      data.rejectedReason = rejectedReason || null;
    }

    const advance = await prisma.cashAdvance.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(advance);
  } catch (error) {
    console.error("Error updating cash advance:", error);
    return NextResponse.json(
      { error: "지급 상태 변경에 실패했습니다." },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.cashAdvance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "지급 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    if (session.user.role === "ADMIN") {
      // 관리자는 모든 상태 삭제 가능
    } else if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "본인의 지급만 취소할 수 있습니다." }, { status: 403 });
    } else if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "대기 상태의 지급만 취소할 수 있습니다." }, { status: 400 });
    }

    await prisma.cashAdvance.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cash advance:", error);
    return NextResponse.json(
      { error: "지급 취소에 실패했습니다." },
      { status: 500 }
    );
  }
}
