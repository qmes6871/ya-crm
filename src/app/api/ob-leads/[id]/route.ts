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

    const { id } = await params;
    const body = await request.json();

    // 통화 기록 추가
    if (body.callLog) {
      const { result, note } = body.callLog;

      await prisma.obCallLog.create({
        data: {
          leadId: id,
          callerId: session.user.id,
          result,
          note: note || null,
        },
      });

      // 리드 상태도 업데이트
      const lead = await prisma.obLead.update({
        where: { id },
        data: { status: result },
        include: {
          assignee: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          callLogs: {
            include: {
              caller: { select: { id: true, name: true } },
            },
            orderBy: { calledAt: "desc" },
          },
        },
      });

      return NextResponse.json(lead);
    }

    // 일반 수정 (관리자만)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, customerName, customerLink, memo, assigneeId, status } = body;

    const lead = await prisma.obLead.update({
      where: { id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(customerName !== undefined && { customerName: customerName || null }),
        ...(customerLink !== undefined && { customerLink: customerLink || null }),
        ...(memo !== undefined && { memo: memo || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        callLogs: {
          include: {
            caller: { select: { id: true, name: true } },
          },
          orderBy: { calledAt: "desc" },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating OB lead:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.obLead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting OB lead:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
