import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      include: {
        consultant: {
          select: { id: true, name: true },
        },
        sources: true,
        quotes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
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
      consultantId,
      consultDate,
      customerName,
      contact,
      sources,
      inquiry,
      quotes,
      result,
      resultNote,
    } = body;

    const lead = await prisma.lead.create({
      data: {
        consultantId,
        consultDate: new Date(consultDate),
        customerName,
        contact,
        inquiry,
        result,
        resultNote,
        sources: {
          create: sources.map((s: { type: string; customType?: string }) => ({
            type: s.type,
            customType: s.customType,
          })),
        },
        quotes: {
          create: quotes.map((q: { type: string; amount: number }) => ({
            type: q.type,
            amount: q.amount,
          })),
        },
      },
      include: {
        consultant: true,
        sources: true,
        quotes: true,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
