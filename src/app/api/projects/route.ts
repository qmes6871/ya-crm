import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { isDemoUser } from "@/lib/demo";

const defaultSchedules: { stage: ProjectStatus; stageName: string }[] = [
  { stage: "PLANNING", stageName: "기획" },
  { stage: "FIRST_DRAFT", stageName: "1차 시안 작업" },
  { stage: "FIRST_DRAFT_REVIEW", stageName: "1차 시안 공개" },
  { stage: "REVISION", stageName: "시안 수정" },
  { stage: "FINAL_REVIEW", stageName: "시안 공개" },
  { stage: "OPEN", stageName: "오픈" },
];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const demoFilter = isDemoUser(session)
      ? { id: { startsWith: "demo-proj-" } }
      : { NOT: { id: { startsWith: "demo-proj-" } } };

    const where = statusParam
      ? { ...demoFilter, status: { in: statusParam.split(",") as ProjectStatus[] } }
      : demoFilter;

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      managerId,
      name,
      description,
      deadline,
      firstDraftDate,
      secondDraftDate,
      serverCost,
      serverCostCustom,
      maintenance,
      maintenanceCustom,
      instructionPurpose,
      instructionFeatures,
      instructionDesign,
      instructionPages,
      instructionNotes,
      payments,
    } = body;

    if (!clientId || !name || !deadline) {
      return NextResponse.json(
        { error: "Client, project name, and deadline are required" },
        { status: 400 }
      );
    }

    const instructionFields = {
      instructionPurpose,
      instructionFeatures,
      instructionDesign,
      instructionPages,
      instructionNotes,
    };
    const missingInstruction = Object.entries(instructionFields)
      .filter(([, v]) => !v || !String(v).trim())
      .map(([k]) => k);
    if (missingInstruction.length > 0) {
      return NextResponse.json(
        { error: "작업지시서의 모든 항목은 필수입니다.", missing: missingInstruction },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        clientId,
        managerId: managerId || session.user.id,
        name,
        description,
        deadline: new Date(deadline),
        firstDraftDate: firstDraftDate ? new Date(firstDraftDate) : null,
        secondDraftDate: secondDraftDate ? new Date(secondDraftDate) : null,
        serverCost,
        serverCostCustom,
        maintenance,
        maintenanceCustom,
        instructionPurpose,
        instructionFeatures,
        instructionDesign,
        instructionPages,
        instructionNotes,
        status: "PLANNING",
        progress: 0,
        schedules: {
          create: defaultSchedules.map((schedule, index) => ({
            stage: schedule.stage,
            stageName: schedule.stageName,
            status: "PENDING",
            sortOrder: index,
          })),
        },
        ...(payments && payments.length > 0 && {
          payments: {
            create: payments.map((p: { type: string; amount: number }) => ({
              type: p.type,
              amount: p.amount,
            })),
          },
        }),
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, name: true },
        },
        schedules: {
          orderBy: { sortOrder: "asc" },
        },
        payments: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
