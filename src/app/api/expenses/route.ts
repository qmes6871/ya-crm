import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
      where.paidAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    } else if (startDate) {
      where.paidAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.paidAt = { lte: new Date(endDate + "T23:59:59.999Z") };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { attachments: true },
      orderBy: { paidAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "매입 목록을 가져오는데 실패했습니다." },
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

    const formData = await request.formData();
    const category = formData.get("category") as string;
    const amount = formData.get("amount") as string;
    const description = formData.get("description") as string;
    const paidAt = formData.get("paidAt") as string;
    const files = formData.getAll("files") as File[];

    if (!category || !amount || !paidAt) {
      return NextResponse.json(
        { error: "카테고리, 금액, 지급일은 필수입니다." },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description: description || null,
        paidAt: paidAt ? new Date(paidAt) : null,
      },
    });

    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads", "expenses", expense.id);
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
              expenseId: expense.id,
              fileName,
              originalName: file.name,
              filePath: `/uploads/expenses/${expense.id}/${fileName}`,
              fileSize: file.size,
              mimeType: file.type,
            },
          });
        }
      }
    }

    const result = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: { attachments: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "매입 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
