import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is not configured. Generate a strong secret and add it to the environment.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,

  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "BSC Credentials",

      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "Enter your username",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
      },

      async authorize(credentials) {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!username || !password) {
          return null;
        }

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

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.username,
          username: user.username,
          role: user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = user.username;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username = (token.username as string) ?? "";
        session.user.role = (token.role as UserRole) ?? UserRole.USER;
        session.user.departmentId = (token.departmentId as string) ?? "";
      }

      return session;
    },
  },
});
