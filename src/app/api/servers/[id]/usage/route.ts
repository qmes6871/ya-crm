import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import { validateLocalPath } from "@/lib/path-validation";

const execFileAsync = promisify(execFile);

// 서버 타입별 스펙 (바이트 단위)
const serverTypeSpecs: Record<string, { storage: number; traffic: number | null }> = {
  GENERAL: { storage: 2 * 1024 * 1024 * 1024, traffic: 4 * 1024 * 1024 * 1024 }, // 2GB, 4GB
  BUSINESS: { storage: 5 * 1024 * 1024 * 1024, traffic: 10 * 1024 * 1024 * 1024 }, // 5GB, 10GB
  FIRST_CLASS: { storage: 10 * 1024 * 1024 * 1024, traffic: 20 * 1024 * 1024 * 1024 }, // 10GB, 20GB
  GIANT: { storage: 15 * 1024 * 1024 * 1024, traffic: 40 * 1024 * 1024 * 1024 }, // 15GB, 40GB
  UNLIMITED_PLUS: { storage: 20 * 1024 * 1024 * 1024, traffic: null }, // 20GB, 무제한
};

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
      select: {
        localPath: true,
        serverType: true,
        domain: true,
        trafficResetAt: true,
      },
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const spec = server.serverType ? serverTypeSpecs[server.serverType] : null;

    let diskUsage = 0;
    let trafficUsage = 0;

    const safeLocalPath = server.localPath ? validateLocalPath(server.localPath) : null;

    if (safeLocalPath) {
      try {
        const { stdout } = await execFileAsync("du", ["-sb", safeLocalPath]);
        diskUsage = parseInt(stdout.split(/\s+/)[0]) || 0;
      } catch {
        diskUsage = 0;
      }
    }

    const trafficResetAt = server.trafficResetAt;
    if (safeLocalPath) {
      try {
        const folderName = safeLocalPath.split("/").pop();

        if (folderName) {
          let awkScript: string;

          if (trafficResetAt) {
            const resetTimestamp = Math.floor(new Date(trafficResetAt).getTime() / 1000);
            awkScript = `BEGIN{split("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec",m," ");for(i=1;i<=12;i++)mon[m[i]]=i}/${folderName}\\//{match($4,/\\[([0-9]+)\\/([A-Za-z]+)\\/([0-9]+):([0-9]+):([0-9]+):([0-9]+)/,a);t=mktime(a[3]" "mon[a[2]]" "a[1]" "a[4]" "a[5]" "a[6]);if(t>=resetTs)sum+=$10}END{print sum+0}`;
            const { stdout } = await execFileAsync("awk", [
              "-v",
              `resetTs=${resetTimestamp}`,
              awkScript,
              "/var/log/nginx/access.log",
            ]);
            trafficUsage = parseInt(stdout.trim()) || 0;
          } else {
            awkScript = `/${folderName}\\// {sum += $10} END {print sum+0}`;
            const { stdout } = await execFileAsync("awk", [
              awkScript,
              "/var/log/nginx/access.log",
            ]);
            trafficUsage = parseInt(stdout.trim()) || 0;
          }
        }
      } catch {
        trafficUsage = 0;
      }
    }

    return NextResponse.json({
      disk: {
        used: diskUsage,
        total: spec?.storage || null,
        percentage: spec?.storage ? Math.round((diskUsage / spec.storage) * 100) : null,
      },
      traffic: {
        used: trafficUsage,
        total: spec?.traffic || null, // null = 무제한
        percentage: spec?.traffic ? Math.round((trafficUsage / spec.traffic) * 100) : null,
        isUnlimited: spec?.traffic === null,
        resetAt: trafficResetAt,
      },
      serverType: server.serverType,
    });
  } catch (error) {
    console.error("Error fetching server usage:", error);
    return NextResponse.json(
      { error: "서버 사용량을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
