import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const category = formData.get("category") as string;
    const amount = formData.get("amount") as string;
    const description = formData.get("description") as string;
    const paidAt = formData.get("paidAt") as string;
    const files = formData.getAll("files") as File[];
    const removeAttachmentIds = formData.getAll("removeAttachmentIds") as string[];

    await prisma.expense.update({
      where: { id },
      data: {
        category,
        amount: parseFloat(amount),
        description: description || null,
        paidAt: paidAt ? new Date(paidAt) : null,
      },
    });

    // Remove attachments
    if (removeAttachmentIds.length > 0) {
      const toRemove = await prisma.expenseAttachment.findMany({
        where: { id: { in: removeAttachmentIds } },
      });
      for (const att of toRemove) {
        try {
          await unlink(path.join(process.cwd(), att.filePath));
        } catch { /* file may not exist */ }
      }
      await prisma.expenseAttachment.deleteMany({
        where: { id: { in: removeAttachmentIds } },
      });
    }

    // Add new attachments
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads", "expenses", id);
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = path.join(uploadDir, fileName);
          await writeFile(filePath, buffer);

          await prisma.expenseAttachment.create({
            data: {
              expenseId: id,
              fileName,
              originalName: file.name,
              filePath: `/uploads/expenses/${id}/${fileName}`,
              fileSize: file.size,
              mimeType: file.type,
            },
          });
        }
      }
    }

    const result = await prisma.expense.findUnique({
      where: { id },
      include: { attachments: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "매입 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

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

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "매입 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
