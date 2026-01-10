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

    const comments = await prisma.projectComment.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
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
    const content = formData.get("content") as string;
    const files = formData.getAll("files") as File[];

    // Create comment
    const comment = await prisma.projectComment.create({
      data: {
        projectId: id,
        userId: session.user.id,
        content: content || "",
      },
    });

    // Handle file attachments
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads", "comments", comment.id);
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = path.join(uploadDir, fileName);

          await writeFile(filePath, buffer);

          await prisma.commentAttachment.create({
            data: {
              commentId: comment.id,
              fileName: file.name,
              filePath: `/uploads/comments/${comment.id}/${fileName}`,
              fileSize: file.size,
              mimeType: file.type,
            },
          });
        }
      }
    }

    const commentWithAttachments = await prisma.projectComment.findUnique({
      where: { id: comment.id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        attachments: true,
      },
    });

    return NextResponse.json(commentWithAttachments, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
