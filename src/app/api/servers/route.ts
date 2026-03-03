import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const servers = await prisma.server.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: { id: true, name: true },
            },
            manager: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(servers);
  } catch (error) {
    console.error("Error fetching servers:", error);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      name,
      serverType,
      serverTypeCustom,
      localPath,
      paymentDay,
      hostingProvider,
      hostingProviderCustom,
      domain,
      githubUrl,
      adminUrl,
      adminId,
      adminPassword,
      ftpHost,
      ftpId,
      ftpPassword,
      ftpPort,
      dbHost,
      dbPort,
      dbName,
      dbUser,
      dbPassword,
      note,
    } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: "프로젝트와 서버명은 필수입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 여부 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const server = await prisma.server.create({
      data: {
        projectId,
        name,
        serverType: serverType || null,
        serverTypeCustom: serverTypeCustom || null,
        localPath: localPath || null,
        paymentDay: paymentDay ? parseInt(paymentDay) : null,
        hostingProvider: hostingProvider || null,
        hostingProviderCustom: hostingProviderCustom || null,
        domain: domain || null,
        githubUrl: githubUrl || null,
        adminUrl: adminUrl || null,
        adminId: adminId || null,
        adminPassword: adminPassword || null,
        ftpHost: ftpHost || null,
        ftpId: ftpId || null,
        ftpPassword: ftpPassword || null,
        ftpPort: ftpPort || null,
        dbHost: dbHost || null,
        dbPort: dbPort || null,
        dbName: dbName || null,
        dbUser: dbUser || null,
        dbPassword: dbPassword || null,
        note: note || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    console.error("Error creating server:", error);
    return NextResponse.json(
      { error: "서버 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
