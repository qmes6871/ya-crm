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

    const files = await prisma.file.findMany({
      where: { projectId: id, isDeleted: false },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "projects", id);
    await mkdir(uploadDir, { recursive: true });

    const createdFiles = [];

    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const dbFile = await prisma.file.create({
          data: {
            uploaderId: session.user.id,
            projectId: id,
            fileName: fileName,
            originalName: file.name,
            filePath: `/uploads/projects/${id}/${fileName}`,
            fileSize: file.size,
            mimeType: file.type,
          },
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
        });

        createdFiles.push(dbFile);
      }
    }

    return NextResponse.json(createdFiles, { status: 201 });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
