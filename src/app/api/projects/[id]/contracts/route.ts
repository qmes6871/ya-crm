import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
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

    const contracts = await prisma.projectContract.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

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
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "contracts", id);
    await mkdir(uploadDir, { recursive: true });

    const createdContracts = [];

    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const contract = await prisma.projectContract.create({
          data: {
            projectId: id,
            fileName: file.name,
            filePath: `/uploads/contracts/${id}/${fileName}`,
            fileSize: file.size,
            mimeType: file.type,
          },
        });

        createdContracts.push(contract);
      }
    }

    return NextResponse.json(createdContracts, { status: 201 });
  } catch (error) {
    console.error("Error uploading contracts:", error);
    return NextResponse.json(
      { error: "Failed to upload contracts" },
      { status: 500 }
    );
  }
}
