import { createClient } from "./server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@localhost";
const DEV_USER_NAME = "Dev User";

export function isAuthBypassed() {
  return process.env.DEV_BYPASS_AUTH === "true";
}

function devUser(): User {
  return {
    id: DEV_USER_ID,
    email: DEV_USER_EMAIL,
    app_metadata: { provider: "dev" },
    user_metadata: { full_name: DEV_USER_NAME },
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date(0).toISOString(),
  } as unknown as User;
}

let devUserSeeded = false;
async function seedDevAuthUser() {
  if (devUserSeeded) return;
  // Idempotent insert into auth.users. The on_auth_user_created trigger
  // will create the matching profiles + prediction_visibility rows.
  await db.execute(sql`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      ${DEV_USER_ID}::uuid,
      'authenticated',
      'authenticated',
      ${DEV_USER_EMAIL},
      '',
      now(),
      '{"provider":"dev","providers":["dev"]}'::jsonb,
      ${JSON.stringify({ full_name: DEV_USER_NAME })}::jsonb,
      false,
      now(),
      now(),
      '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING
  `);
  devUserSeeded = true;
}

export async function getUser() {
  if (isAuthBypassed()) {
    await seedDevAuthUser();
    return devUser();
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
