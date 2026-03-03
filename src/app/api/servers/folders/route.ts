import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readdir, stat } from "fs/promises";
import { join } from "path";

const BASE_PATH = "/var/www";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await readdir(BASE_PATH);
    const folders: { name: string; path: string }[] = [];

    for (const entry of entries) {
      const fullPath = join(BASE_PATH, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          folders.push({
            name: entry,
            path: fullPath,
          });
        }
      } catch {
        // 권한 없는 폴더는 스킵
        continue;
      }
    }

    // 이름 순 정렬
    folders.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error reading folders:", error);
    return NextResponse.json(
      { error: "폴더 목록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
