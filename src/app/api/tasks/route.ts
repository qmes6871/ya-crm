import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isDemoUser } from "@/lib/demo";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personal = searchParams.get("personal") === "true";
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};

    if (isDemoUser(session)) {
      where.id = { startsWith: "demo-task-" };
    } else {
      where.NOT = { id: { startsWith: "demo-task-" } };
    }

    if (personal) {
      where.assigneeId = session.user.id;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { priority: "desc" },
        { deadline: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      deadline,
      projectId,
      assigneeId,
    } = body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "NORMAL",
        deadline: deadline ? new Date(deadline) : null,
        projectId,
        creatorId: session.user.id,
        assigneeId: assigneeId || session.user.id,
      },
      include: {
        project: true,
        assignee: true,
        creator: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
