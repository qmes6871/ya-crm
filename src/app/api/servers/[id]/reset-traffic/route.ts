import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const server = await prisma.server.update({
      where: { id },
      data: {
        trafficResetAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      trafficResetAt: server.trafficResetAt
    });
  } catch (error) {
    console.error("Error resetting traffic:", error);
    return NextResponse.json(
      { error: "트래픽 초기화에 실패했습니다." },
      { status: 500 }
    );
  }
}
