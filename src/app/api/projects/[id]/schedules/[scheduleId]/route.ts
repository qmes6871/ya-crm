import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, scheduleId } = await params;
    const body = await request.json();
    const { stageName, startDate, endDate, status, sortOrder } = body;

    const schedule = await prisma.projectSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(stageName !== undefined && { stageName }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(status !== undefined && { status }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // If status changed, update project progress
    if (status !== undefined) {
      await updateProjectProgress(projectId);
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, scheduleId } = await params;

    await prisma.projectSchedule.delete({
      where: { id: scheduleId },
    });

    // Update project progress after deletion
    await updateProjectProgress(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}

async function updateProjectProgress(projectId: string) {
  const schedules = await prisma.projectSchedule.findMany({
    where: { projectId },
  });

  if (schedules.length === 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: { progress: 0 },
    });
    return;
  }

  const completedCount = schedules.filter((s) => s.status === "COMPLETED").length;
  const progress = Math.round((completedCount / schedules.length) * 100);

  // Determine project status based on progress
  let projectStatus = "PLANNING";
  if (progress === 100) {
    projectStatus = "COMPLETED";
  } else if (progress > 0) {
    // Find the last completed schedule to determine current stage
    const completedSchedules = schedules
      .filter((s) => s.status === "COMPLETED")
      .sort((a, b) => b.sortOrder - a.sortOrder);

    if (completedSchedules.length > 0) {
      projectStatus = completedSchedules[0].stage;
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      progress,
      status: projectStatus as any,
    },
  });
}
