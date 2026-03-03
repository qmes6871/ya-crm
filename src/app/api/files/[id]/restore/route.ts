import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 파일 복원 (휴지통에서 복구)
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

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!file.isDeleted) {
      return NextResponse.json(
        { error: "File is not in trash" },
        { status: 400 }
      );
    }

    // 파일 복원
    await prisma.file.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring file:", error);
    return NextResponse.json(
      { error: "Failed to restore file" },
      { status: 500 }
    );
  }
}
