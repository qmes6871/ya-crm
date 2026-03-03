import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";

const execAsync = promisify(exec);

const NGINX_SUSPENDED_DIR = "/etc/nginx/suspended-sites";
const NGINX_SITES_ENABLED_DIR = "/etc/nginx/sites-enabled";

// 도메인에서 호스트명만 추출하는 함수
function extractDomain(domain: string): string {
  let host = domain.replace(/^https?:\/\//, "");
  host = host.split("/")[0];
  host = host.split(":")[0];
  return host;
}

// IP 주소인지 확인하는 함수
function isIPAddress(host: string): boolean {
  // IPv4 패턴 체크
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4Pattern.test(host);
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
    const { action } = body; // 'suspend' or 'activate'

    const server = await prisma.server.findUnique({
      where: { id },
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (!server.localPath) {
      return NextResponse.json(
        { error: "로컬 폴더 경로가 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    // 폴더명 추출
    const folderName = server.localPath.split("/").pop();
    if (!folderName) {
      return NextResponse.json(
        { error: "폴더명을 추출할 수 없습니다." },
        { status: 400 }
      );
    }

    const nginxFolderConfigPath = `${NGINX_SUSPENDED_DIR}/${folderName}.conf`;

    // 도메인이 있으면 도메인용 설정 파일 경로도 준비
    // 도메인 server 블록은 http 레벨에서 include되어야 하므로 sites-enabled에 저장
    // 단, IP 주소인 경우 도메인 차단을 생성하지 않음 (다른 서비스까지 차단될 수 있음)
    const extractedHost = server.domain ? extractDomain(server.domain) : null;
    const domainHost = extractedHost && !isIPAddress(extractedHost) ? extractedHost : null;
    const nginxDomainConfigPath = domainHost
      ? `${NGINX_SITES_ENABLED_DIR}/suspended-${domainHost.replace(/\./g, "_")}.conf`
      : null;

    if (action === "suspend") {
      // 서버 중단: nginx 설정 파일 생성
      const folderConfig = `# Suspended site: ${server.name}
# Folder: ${server.localPath}
# Suspended at: ${new Date().toISOString()}

location ~ ^/${folderName}(/|$) {
    root /var/www;
    try_files /suspended.html =503;
}
`;

      // 도메인 차단용 설정 (서버 블록)
      const domainConfig = domainHost ? `# Suspended domain: ${server.name}
# Domain: ${server.domain}
# Suspended at: ${new Date().toISOString()}

server {
    listen 80;
    server_name ${domainHost} www.${domainHost};

    root /var/www;

    location / {
        try_files /suspended.html =503;
    }
}
` : null;

      try {
        // suspended-sites 디렉토리 생성 (없으면)
        await execAsync(`mkdir -p ${NGINX_SUSPENDED_DIR}`);

        // 폴더 경로용 nginx 설정 파일 생성
        await writeFile(nginxFolderConfigPath, folderConfig);

        // 도메인이 있으면 도메인용 설정 파일도 생성
        if (domainConfig && nginxDomainConfigPath) {
          await writeFile(nginxDomainConfigPath, domainConfig);
        }

        // nginx 설정 테스트 및 리로드
        await execAsync("nginx -t && systemctl reload nginx");

        // DB 업데이트
        const updatedServer = await prisma.server.update({
          where: { id },
          data: {
            isActive: false,
            suspendedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          isActive: updatedServer.isActive,
          message: domainHost
            ? `서버가 중단되었습니다. (폴더 경로 및 ${domainHost} 도메인 차단)`
            : "서버가 중단되었습니다.",
        });
      } catch (error) {
        console.error("Error suspending server:", error);
        // 실패 시 설정 파일 삭제 시도
        try {
          await unlink(nginxFolderConfigPath);
        } catch {}
        try {
          if (nginxDomainConfigPath) {
            await unlink(nginxDomainConfigPath);
          }
        } catch {}
        return NextResponse.json(
          { error: "서버 중단에 실패했습니다. nginx 설정을 확인하세요." },
          { status: 500 }
        );
      }
    } else if (action === "activate") {
      // 서버 활성화: nginx 설정 파일 삭제
      try {
        // 폴더 경로용 nginx 설정 파일 삭제
        try {
          await unlink(nginxFolderConfigPath);
        } catch {}

        // 도메인용 설정 파일도 삭제
        if (nginxDomainConfigPath) {
          try {
            await unlink(nginxDomainConfigPath);
          } catch {}
        }

        // nginx 리로드
        await execAsync("systemctl reload nginx");

        // DB 업데이트
        const updatedServer = await prisma.server.update({
          where: { id },
          data: {
            isActive: true,
            suspendedAt: null,
          },
        });

        return NextResponse.json({
          success: true,
          isActive: updatedServer.isActive,
          message: "서버가 활성화되었습니다.",
        });
      } catch (error) {
        console.error("Error activating server:", error);

        // 파일이 없어도 DB는 업데이트
        const updatedServer = await prisma.server.update({
          where: { id },
          data: {
            isActive: true,
            suspendedAt: null,
          },
        });

        return NextResponse.json({
          success: true,
          isActive: updatedServer.isActive,
          message: "서버가 활성화되었습니다.",
        });
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'suspend' or 'activate'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error toggling server status:", error);
    return NextResponse.json(
      { error: "서버 상태 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
