import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

const defaultStages: { stage: ProjectStatus; stageName: string }[] = [
  { stage: "PLANNING", stageName: "기획" },
  { stage: "FIRST_DRAFT", stageName: "1차 시안 작업" },
  { stage: "FIRST_DRAFT_REVIEW", stageName: "1차 시안 공개" },
  { stage: "REVISION", stageName: "시안 수정" },
  { stage: "FINAL_REVIEW", stageName: "시안 공개" },
  { stage: "OPEN", stageName: "오픈" },
];

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

    // Check if schedules already exist
    const existingSchedules = await prisma.projectSchedule.count({
      where: { projectId: id },
    });

    if (existingSchedules > 0) {
      return NextResponse.json(
        { error: "Schedules already exist" },
        { status: 400 }
      );
    }

    // Create default schedules
    const schedules = await prisma.projectSchedule.createMany({
      data: defaultStages.map((stage, index) => ({
        projectId: id,
        stage: stage.stage,
        stageName: stage.stageName,
        sortOrder: index,
        isCompleted: false,
      })),
    });

    return NextResponse.json({ count: schedules.count }, { status: 201 });
  } catch (error) {
    console.error("Error initializing schedules:", error);
    return NextResponse.json(
      { error: "Failed to initialize schedules" },
      { status: 500 }
    );
  }
}
