import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
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

    if (isDemoUser(session) && !id.startsWith("demo-client-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        requestTypes: true,
        projects: {
          include: {
            manager: {
              select: { id: true, name: true },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
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

    if (isDemoUser(session) && !id.startsWith("demo-client-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, contact, contractDate, firstDraftDate, requirements, requestTypes } = body;

    // Update client with transaction to handle request types
    const client = await prisma.$transaction(async (tx) => {
      // Update basic client info
      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(contact !== undefined && { contact }),
          ...(contractDate !== undefined && {
            contractDate: contractDate ? new Date(contractDate) : null,
          }),
          ...(firstDraftDate !== undefined && {
            firstDraftDate: firstDraftDate ? new Date(firstDraftDate) : null,
          }),
          ...(requirements !== undefined && { requirements }),
        },
      });

      // Update request types if provided
      if (requestTypes !== undefined) {
        // Delete existing request types
        await tx.clientRequestType.deleteMany({
          where: { clientId: id },
        });

        // Create new request types
        if (requestTypes.length > 0) {
          await tx.clientRequestType.createMany({
            data: requestTypes.map((rt: { type: string; customType: string | null }) => ({
              clientId: id,
              type: rt.type,
              customType: rt.customType,
            })),
          });
        }
      }

      return updatedClient;
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
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

    if (isDemoUser(session) && !id.startsWith("demo-client-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
