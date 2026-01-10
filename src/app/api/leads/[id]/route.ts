import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        consultant: {
          select: { id: true, name: true, email: true },
        },
        sources: true,
        quotes: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
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

    // Delete existing sources and quotes
    await prisma.leadSource.deleteMany({ where: { leadId: id } });
    await prisma.leadQuote.deleteMany({ where: { leadId: id } });

    // Update lead with new data
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        consultantId,
        consultDate: consultDate ? new Date(consultDate) : undefined,
        customerName,
        contact,
        inquiry,
        result,
        resultNote,
        sources: {
          create: sources?.map((s: { type: string; customType: string | null }) => ({
            type: s.type,
            customType: s.customType,
          })) || [],
        },
        quotes: {
          create: quotes?.map((q: { type: string; amount: number }) => ({
            type: q.type,
            amount: q.amount,
          })) || [],
        },
      },
      include: {
        consultant: {
          select: { id: true, name: true, email: true },
        },
        sources: true,
        quotes: true,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
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

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
