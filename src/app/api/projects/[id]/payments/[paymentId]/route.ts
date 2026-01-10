import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    const body = await request.json();
    const { type, amount } = body;

    const payment = await prisma.projectPayment.update({
      where: { id: paymentId },
      data: {
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;

    await prisma.projectPayment.delete({
      where: { id: paymentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
