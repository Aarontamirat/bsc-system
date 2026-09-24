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

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main(): Promise<void> {
  console.log("Checking BSC authentication configuration...");
  console.log(`Username being checked: ${username}`);

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      role: true,
      departmentId: true,
      isActive: true,
    },
  });

  if (!user) {
    console.error("");
    console.error("RESULT: USER NOT FOUND");
    console.error(`No user exists with username "${username}".`);
    return;
  }

  console.log("RESULT: USER FOUND");
  console.log(`User ID: ${user.id}`);
  console.log(`Username: ${user.username}`);
  console.log(`Role: ${user.role}`);
  console.log(`Department ID: ${user.departmentId}`);
  console.log(`Active: ${user.isActive}`);

  if (!user.isActive) {
    console.error("");
    console.error("AUTHENTICATION WILL FAIL because the user is inactive.");
    return;
  }

  if (!password) {
    console.error("Password is not provided");
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  console.log(`Password matches stored hash: ${passwordMatches}`);

  if (!passwordMatches) {
    console.error("");
    console.error(
      "AUTHENTICATION WILL FAIL because the password does not match the stored bcrypt hash.",
    );
    return;
  }

  console.log("");
  console.log(
    "AUTHENTICATION CHECK PASSED. The database credentials are valid.",
  );
  console.log(
    "If the browser still rejects login, the next issue is inside the Auth.js request/configuration path.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("Authentication verification failed.");

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
