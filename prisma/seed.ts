import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@yasolution.com" },
    update: {},
    create: {
      email: "admin@yasolution.com",
      password: adminPassword,
      name: "관리자",
      role: "ADMIN",
      isActive: true,
      permissions: {
        create: {
          clients: true,
          projects: true,
          leads: true,
          tasks: true,
          documents: true,
          accounts: true,
          settlements: true,
          revenue: true,
          settings: true,
        },
      },
      incentives: {
        create: {
          advanceRate: 20,
          midPaymentRate: 15,
          balanceRate: 10,
          fullPaymentRate: 20,
        },
      },
      notificationSettings: {
        create: {
          emailEnabled: true,
          smsEnabled: false,
          kakaoEnabled: false,
          taskReminder: true,
          projectUpdate: true,
          newLead: true,
          settlement: true,
        },
      },
    },
  });

  console.log("Admin user created:", admin.email);
  console.log("Login with: admin@yasolution.com / admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
