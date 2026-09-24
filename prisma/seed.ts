import "dotenv/config";

import bcrypt from "bcrypt";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. Add it to your .env file before running the seed.",
  );
}

const adminUsername =
  process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase() || "admin";

const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error(
    "SEED_ADMIN_PASSWORD is not configured. Add a strong password to .env before running the seed.",
  );
}

if (adminPassword.length < 12) {
  throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const departments = [
  {
    name: "Administration",
    description: "Administrative and corporate support functions.",
  },
  {
    name: "Finance & Accounts",
    description:
      "Financial planning, accounting, reporting, budgeting and related functions.",
  },
  {
    name: "Human Resources",
    description:
      "Human resource management, employee development and organizational support.",
  },
  {
    name: "Information Technology",
    description:
      "Information technology, software systems, infrastructure and ICT operations.",
  },
];

async function main(): Promise<void> {
  console.log("Starting BSC database seed...");

  const departmentRecords = new Map<
    string,
    {
      id: string;
      name: string;
    }
  >();

  for (const department of departments) {
    const record = await prisma.department.upsert({
      where: {
        name: department.name,
      },
      update: {
        description: department.description,
        isActive: true,
      },
      create: {
        name: department.name,
        description: department.description,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    departmentRecords.set(record.name, record);
  }

  const administrationDepartment = departmentRecords.get("Administration");

  if (!administrationDepartment) {
    throw new Error("Administration department was not created successfully.");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      username: adminUsername,
    },
    select: {
      id: true,
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: {
        id: existingAdmin.id,
      },
      data: {
        role: UserRole.ADMIN,
        departmentId: administrationDepartment.id,
        isActive: true,
      },
    });

    console.log(
      `Admin user "${adminUsername}" already exists; existing password preserved.`,
    );
  } else {
    const passwordHash = await bcrypt.hash("adminPassword", 12);

    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: UserRole.ADMIN,
        departmentId: administrationDepartment.id,
        isActive: true,
      },
    });

    console.log(`Created admin user "${adminUsername}".`);
  }

  console.log("Departments:");

  for (const department of departmentRecords.values()) {
    console.log(`  - ${department.name}`);
  }

  console.log("BSC database seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("BSC database seed failed.");

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
