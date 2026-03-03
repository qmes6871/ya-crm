import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "my" | "shared"

    let where = {};
    if (type === "my") {
      where = { ownerId: session.user.id };
    } else if (type === "shared") {
      where = { isShared: true };
    } else {
      // 기본: 내 계정 + 공유 계정 모두
      where = {
        OR: [
          { ownerId: session.user.id },
          { isShared: true },
        ],
      };
    }

    const accounts = await prisma.managedAccount.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
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
    const { platform, accountId, password, socialLogin, socialNote, isShared } = body;

    if (!platform || !accountId || !password) {
      return NextResponse.json(
        { error: "Platform, account ID, and password are required" },
        { status: 400 }
      );
    }

    const account = await prisma.managedAccount.create({
      data: {
        ownerId: session.user.id,
        platform,
        accountId,
        password,
        socialLogin: socialLogin || null,
        socialNote: socialNote || null,
        isShared: isShared || false,
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
