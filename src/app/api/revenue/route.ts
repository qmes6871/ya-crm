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

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.receivedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    } else if (startDate) {
      where.receivedAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.receivedAt = { lte: new Date(endDate + "T23:59:59.999Z") };
    }

    const revenues = await prisma.revenue.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json(revenues);
  } catch (error) {
    console.error("Error fetching revenues:", error);
    return NextResponse.json(
      { error: "매출 목록을 가져오는데 실패했습니다." },
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
    const { projectId, type, amount, description, receivedAt } = body;

    if (!type || amount === undefined) {
      return NextResponse.json(
        { error: "유형과 금액은 필수입니다." },
        { status: 400 }
      );
    }

    const revenue = await prisma.revenue.create({
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

    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    console.error("Error creating revenue:", error);
    return NextResponse.json(
      { error: "매출 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
