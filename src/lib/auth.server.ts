import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/index.server";
import * as schema from "@/db/schema";
import { sendMail } from "./mailer.server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Сброс пароля — ОБЛАКО",
        html: `<p>Здравствуйте!</p><p>Чтобы сбросить пароль, перейдите по ссылке:</p><p><a href="${url}">${url}</a></p><p>Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Подтвердите email — ОБЛАКО",
        html: `<p>Здравствуйте, ${user.name || ""}!</p><p>Подтвердите ваш email:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // refresh once a day
  },
  user: {
    additionalFields: {},
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          // Create app profile + assign default role
          await db.insert(schema.profiles).values({
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name || "",
          }).onConflictDoNothing();
          await db.insert(schema.userRoles).values({
            userId: createdUser.id,
            role: "user",
          }).onConflictDoNothing();
        },
      },
    },
  },
});

export type Auth = typeof auth;
