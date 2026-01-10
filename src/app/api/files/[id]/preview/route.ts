import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
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

    const filePath = path.join(process.cwd(), file.filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Error previewing file:", error);
    return NextResponse.json(
      { error: "Failed to preview file" },
      { status: 500 }
    );
  }
}
