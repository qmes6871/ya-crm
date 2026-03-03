import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

// 파일 영구 삭제
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

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 실제 파일 삭제
    try {
      const filePath = path.join(process.cwd(), file.filePath);
      await unlink(filePath);
    } catch (err) {
      // 파일이 이미 없어도 DB 레코드는 삭제
      console.warn("File not found on disk:", file.filePath);
    }

    // DB 레코드 삭제
    await prisma.file.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting file:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete file" },
      { status: 500 }
    );
  }
}
