import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");
    const mine = searchParams.get("mine");

    const where: Record<string, unknown> = {};

    // mine=true면 관리자여도 자기 것만
    if (mine === "true") {
      where.assigneeId = session.user.id;
    } else if (session.user.role !== "ADMIN") {
      where.assigneeId = session.user.id;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status) {
      where.status = status;
    }

    const date = searchParams.get("date");
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.assignedDate = { gte: start, lte: end };
    }

    const leads = await prisma.obLead.findMany({
      where,
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
      orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching OB leads:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leads } = body;

    // 단건 또는 다건 등록
    if (Array.isArray(leads)) {
      const created = await prisma.obLead.createMany({
        data: leads.map((lead: { phone: string; customerName?: string; customerLink?: string; memo?: string; assigneeId?: string; assignedDate?: string }) => ({
          phone: lead.phone,
          customerName: lead.customerName || null,
          customerLink: lead.customerLink || null,
          memo: lead.memo || null,
          assignedDate: lead.assignedDate ? new Date(lead.assignedDate) : null,
          assigneeId: lead.assigneeId || null,
          creatorId: session.user.id,
        })),
      });
      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    const { phone, customerName, customerLink, memo, assigneeId, assignedDate } = body;

    if (!phone) {
      return NextResponse.json({ error: "전화번호는 필수입니다" }, { status: 400 });
    }

    const lead = await prisma.obLead.create({
      data: {
        phone,
        customerName: customerName || null,
        customerLink: customerLink || null,
        memo: memo || null,
        assignedDate: assignedDate ? new Date(assignedDate) : null,
        assigneeId: assigneeId || null,
        creatorId: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        callLogs: true,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating OB lead:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
