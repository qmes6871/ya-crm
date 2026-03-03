import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

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

    const where = statusParam
      ? { status: { in: statusParam.split(",") as ProjectStatus[] } }
      : {};

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
    const { clientId, managerId, name, description, deadline, serverCost, serverCostCustom, maintenance, maintenanceCustom, payments } = body;

    if (!clientId || !name || !deadline) {
      return NextResponse.json(
        { error: "Client, project name, and deadline are required" },
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
        serverCost,
        serverCostCustom,
        maintenance,
        maintenanceCustom,
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
