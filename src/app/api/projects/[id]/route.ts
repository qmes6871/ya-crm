import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import prisma from "@/lib/prisma";

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

    if (isDemoUser(session) && !id.startsWith("demo-proj-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        manager: {
          select: { id: true, name: true, email: true },
        },
        schedules: {
          orderBy: { sortOrder: "asc" },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
            attachments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        files: {
          where: { isDeleted: false },
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        contracts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (isDemoUser(session) && !id.startsWith("demo-proj-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      status,
      progress,
      managerId,
      deadline,
      firstDraftDate,
      firstDraftCompletedAt,
      secondDraftDate,
      secondDraftCompletedAt,
      serverCost,
      serverCostCustom,
      maintenance,
      maintenanceCustom,
      instructionPurpose,
      instructionFeatures,
      instructionDesign,
      instructionPages,
      instructionNotes,
    } = body;

    const toDateOrNull = (v: unknown) => {
      if (v === null || v === "") return null;
      if (v === undefined) return undefined;
      return new Date(v as string);
    };

    // 작업지시서 필드 중 하나라도 업데이트 요청이 오면 5개 모두 non-empty 필수
    const instructionFields = {
      instructionPurpose,
      instructionFeatures,
      instructionDesign,
      instructionPages,
      instructionNotes,
    };
    const anyInstructionInBody = Object.values(instructionFields).some((v) => v !== undefined);
    if (anyInstructionInBody) {
      const missing = Object.entries(instructionFields)
        .filter(([, v]) => !v || !String(v).trim())
        .map(([k]) => k);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "작업지시서의 모든 항목은 필수입니다.", missing },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(managerId && { managerId }),
        ...(deadline !== undefined && { deadline: toDateOrNull(deadline) }),
        ...(firstDraftDate !== undefined && { firstDraftDate: toDateOrNull(firstDraftDate) }),
        ...(firstDraftCompletedAt !== undefined && { firstDraftCompletedAt: toDateOrNull(firstDraftCompletedAt) }),
        ...(secondDraftDate !== undefined && { secondDraftDate: toDateOrNull(secondDraftDate) }),
        ...(secondDraftCompletedAt !== undefined && { secondDraftCompletedAt: toDateOrNull(secondDraftCompletedAt) }),
        ...(serverCost !== undefined && { serverCost }),
        ...(serverCostCustom !== undefined && { serverCostCustom }),
        ...(maintenance !== undefined && { maintenance }),
        ...(maintenanceCustom !== undefined && { maintenanceCustom }),
        ...(instructionPurpose !== undefined && { instructionPurpose }),
        ...(instructionFeatures !== undefined && { instructionFeatures }),
        ...(instructionDesign !== undefined && { instructionDesign }),
        ...(instructionPages !== undefined && { instructionPages }),
        ...(instructionNotes !== undefined && { instructionNotes }),
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
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

    if (isDemoUser(session) && !id.startsWith("demo-proj-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
