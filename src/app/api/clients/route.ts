import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isDemoUser } from "@/lib/demo";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = isDemoUser(session)
      ? { id: { startsWith: "demo-client-" } }
      : { NOT: { id: { startsWith: "demo-client-" } } };

    const clients = await prisma.client.findMany({
      where,
      include: {
        requestTypes: true,
        payments: true,
        projects: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      contact,
      contractDate,
      firstDraftDate,
      requirements,
      requestTypes,
      payments,
    } = body;

    const client = await prisma.client.create({
      data: {
        name,
        contact,
        contractDate: contractDate ? new Date(contractDate) : null,
        firstDraftDate: firstDraftDate ? new Date(firstDraftDate) : null,
        requirements,
        requestTypes: requestTypes?.length
          ? {
              create: requestTypes.map((rt: { type: string; customType?: string }) => ({
                type: rt.type,
                customType: rt.customType,
              })),
            }
          : undefined,
        payments: payments?.length
          ? {
              create: payments.map((p: { type: string; amount: number }) => ({
                type: p.type,
                amount: p.amount,
              })),
            }
          : undefined,
      },
      include: {
        requestTypes: true,
        payments: true,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
