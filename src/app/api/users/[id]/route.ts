import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        permissions: true,
        incentives: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const {
      email,
      password,
      name,
      phone,
      role,
      isActive,
      permissions,
      incentives,
    } = body;

    // Check if email already exists (for other users)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "이미 존재하는 이메일입니다." },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          permissions: true,
          incentives: true,
        },
      });

      // Update permissions if provided
      if (permissions !== undefined) {
        await tx.userPermission.upsert({
          where: { userId: id },
          create: {
            userId: id,
            ...permissions,
          },
          update: permissions,
        });
      }

      // Update incentives if provided
      if (incentives !== undefined) {
        if (incentives === null) {
          // Delete incentives if null
          await tx.userIncentive.deleteMany({
            where: { userId: id },
          });
        } else {
          await tx.userIncentive.upsert({
            where: { userId: id },
            create: {
              userId: id,
              ...incentives,
            },
            update: incentives,
          });
        }
      }

      // Fetch updated user with relations
      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          permissions: true,
          incentives: true,
        },
      });
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow deleting yourself
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "자신을 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // Find another admin user to reassign data
    const adminUser = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        id: { not: id },
        isActive: true,
      },
    });

    if (!adminUser) {
      // If no admin, try to find any active user
      const anyUser = await prisma.user.findFirst({
        where: {
          id: { not: id },
          isActive: true,
        },
      });

      if (!anyUser) {
        return NextResponse.json(
          { error: "데이터를 이관할 다른 사용자가 없습니다." },
          { status: 400 }
        );
      }
    }

    const targetUserId = adminUser?.id || (await prisma.user.findFirst({
      where: { id: { not: id }, isActive: true },
    }))?.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "데이터를 이관할 다른 사용자가 없습니다." },
        { status: 400 }
      );
    }

    // Use transaction to reassign all data and delete user
    await prisma.$transaction(async (tx) => {
      // Reassign projects to target user
      await tx.project.updateMany({
        where: { managerId: id },
        data: { managerId: targetUserId },
      });

      // Reassign leads to target user
      await tx.lead.updateMany({
        where: { consultantId: id },
        data: { consultantId: targetUserId },
      });

      // Reassign tasks (assigned to this user) to target user
      await tx.task.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: targetUserId },
      });

      // Reassign tasks (created by this user) to target user
      await tx.task.updateMany({
        where: { creatorId: id },
        data: { creatorId: targetUserId },
      });

      // Reassign calendar events to target user
      await tx.calendarEvent.updateMany({
        where: { userId: id },
        data: { userId: targetUserId },
      });

      // Reassign quotes to target user
      await tx.quote.updateMany({
        where: { creatorId: id },
        data: { creatorId: targetUserId },
      });

      // Reassign files to target user
      await tx.file.updateMany({
        where: { uploaderId: id },
        data: { uploaderId: targetUserId },
      });

      // Reassign settlements to target user
      await tx.settlement.updateMany({
        where: { userId: id },
        data: { userId: targetUserId },
      });

      // Reassign managed accounts to target user
      await tx.managedAccount.updateMany({
        where: { ownerId: id },
        data: { ownerId: targetUserId },
      });

      // Reassign project comments to target user
      await tx.projectComment.updateMany({
        where: { userId: id },
        data: { userId: targetUserId },
      });

      // Reassign OB call logs to target user
      await tx.obCallLog.updateMany({
        where: { callerId: id },
        data: { callerId: targetUserId },
      });

      // Reassign OB leads (assignee) to target user
      await tx.obLead.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: targetUserId },
      });

      // Reassign OB leads (creator) to target user
      await tx.obLead.updateMany({
        where: { creatorId: id },
        data: { creatorId: targetUserId },
      });

      // Delete notifications (these are user-specific, no need to reassign)
      await tx.notification.deleteMany({
        where: { userId: id },
      });

      // Finally delete the user (permissions and incentives will cascade)
      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "사용자 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
