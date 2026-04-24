import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rm } from "fs/promises";
import { validateLocalPath } from "@/lib/path-validation";

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

    const server = await prisma.server.findUnique({
      where: { id },
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

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error("Error fetching server:", error);
    return NextResponse.json(
      { error: "서버 정보를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    if (body.localPath && !validateLocalPath(body.localPath)) {
      return NextResponse.json(
        { error: "localPath는 /var/www/<이름> 형식이어야 합니다." },
        { status: 400 }
      );
    }

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
      ftpPort,
      ftpId,
      ftpPassword,
      dbHost,
      dbPort,
      dbName,
      dbUser,
      dbPassword,
      note,
    } = body;

    const server = await prisma.server.update({
      where: { id },
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
        ftpPort: ftpPort || null,
        ftpId: ftpId || null,
        ftpPassword: ftpPassword || null,
        dbHost: dbHost || null,
        dbPort: dbPort || null,
        dbName: dbName || null,
        dbUser: dbUser || null,
        dbPassword: dbPassword || null,
        note: note || null,
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.error("Error updating server:", error);
    return NextResponse.json(
      { error: "서버 수정에 실패했습니다." },
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

    // 서버 정보 조회
    const server = await prisma.server.findUnique({
      where: { id },
      select: { localPath: true, name: true },
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (server.localPath && validateLocalPath(server.localPath)) {
      try {
        await rm(server.localPath, { recursive: true, force: true });
        console.log(`Deleted folder: ${server.localPath}`);
      } catch (error) {
        console.error(`Failed to delete folder ${server.localPath}:`, error);
      }
    }

    // DB에서 서버 삭제
    await prisma.server.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting server:", error);
    return NextResponse.json(
      { error: "서버 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
