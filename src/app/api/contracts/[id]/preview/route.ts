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

    const contract = await prisma.projectContract.findUnique({
      where: { id },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), contract.filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contract.mimeType || "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Error previewing contract:", error);
    return NextResponse.json(
      { error: "Failed to preview contract" },
      { status: 500 }
    );
  }
}
