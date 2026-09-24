import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const username =
  process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase() || "admin";

const password = process.env.SEED_ADMIN_PASSWORD;

if (!password) {
  throw new Error("SEED_ADMIN_PASSWORD is not configured in .env.");
}

if (password.length < 12) {
  throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error(
      `User "${username}" does not exist. Run the database seed first.`,
    );
  }

  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is not configured in .env. Run the database seed first.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  console.log(`Password reset successfully for "${username}".`);
}

main()
  .catch((error: unknown) => {
    console.error("Admin password reset failed.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
