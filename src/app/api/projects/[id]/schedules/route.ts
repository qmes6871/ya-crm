import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const schedules = await prisma.projectSchedule.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
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
    const body = await request.json();
    const { stageName, startDate, endDate } = body;

    if (!stageName) {
      return NextResponse.json(
        { error: "Stage name is required" },
        { status: 400 }
      );
    }

    // Get the max sort order
    const maxSortOrder = await prisma.projectSchedule.aggregate({
      where: { projectId: id },
      _max: { sortOrder: true },
    });

    const schedule = await prisma.projectSchedule.create({
      data: {
        projectId: id,
        stage: "PLANNING", // Default stage for custom schedules
        stageName,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "PENDING",
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
