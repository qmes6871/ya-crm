import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rm } from "fs/promises";
import path from "path";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await params;

    const contract = await prisma.projectContract.findUnique({
      where: { id: contractId },
    });

    if (contract) {
      // Delete file from filesystem
      const filePath = path.join(process.cwd(), contract.filePath);
      try {
        await rm(filePath, { force: true });
      } catch {
        // File might not exist
      }

      // Delete from database
      await prisma.projectContract.delete({
        where: { id: contractId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
