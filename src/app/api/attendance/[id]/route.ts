import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT: 출퇴근 기록 수정
export async function PUT(
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
    const { checkIn, checkOut } = body;

    // 기존 기록 확인
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "출퇴근 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정 데이터 준비
    const updateData: { checkIn?: Date | null; checkOut?: Date | null } = {};

    if (checkIn !== undefined) {
      updateData.checkIn = checkIn ? new Date(checkIn) : null;
    }

    if (checkOut !== undefined) {
      updateData.checkOut = checkOut ? new Date(checkOut) : null;
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}

// DELETE: 출퇴근 기록 삭제
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

    // 기존 기록 확인
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "출퇴근 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { error: "Failed to delete attendance" },
      { status: 500 }
    );
  }
}
