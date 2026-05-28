import "server-only";

import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import type { QueryResultRow } from "pg";
import type { AppUserRole, AppUserStatus } from "@/types";
import { dbQuery } from "./index";

export interface AppUser {
  id: number;
  email: string;
  displayName: string;
  role: AppUserRole;
  status: AppUserStatus;
  registrationToken: string | null;
  approvedAt: string | null;
  activatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AuthUser extends AppUser {
  passwordHash: string;
}

export interface UserRegistrationRecord extends AppUser {}

interface UserRow extends QueryResultRow {
  id: number;
  email: string;
  display_name: string;
  role: AppUserRole;
  status: AppUserStatus;
  password_hash: string | null;
  registration_token: string | null;
  approved_at: string | Date | null;
  activated_at: string | Date | null;
  rejection_reason: string | null;
  created_at: string | Date;
}

function toIsoString(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    registrationToken: row.registration_token,
    approvedAt: toIsoString(row.approved_at),
    activatedAt: toIsoString(row.activated_at),
    rejectionReason: row.rejection_reason,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function generateRegistrationToken(): string {
  return randomBytes(24).toString("hex");
}

export async function findUserById(id: number): Promise<AppUser | null> {
  const result = await dbQuery<UserRow>(
    `
      select
        id,
        email,
        display_name,
        role,
        status,
        password_hash,
        registration_token,
        approved_at,
        activated_at,
        rejection_reason,
        created_at
      from app_users
      where id = $1
      limit 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function findUserForAuth(email: string): Promise<AuthUser | null> {
  const result = await dbQuery<UserRow>(
    `
      select
        id,
        email,
        display_name,
        role,
        status,
        password_hash,
        registration_token,
        approved_at,
        activated_at,
        rejection_reason,
        created_at
      from app_users
      where lower(email) = lower($1)
        and status = 'active'
        and password_hash is not null
      limit 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row || !row.password_hash) {
    return null;
  }

  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

export async function findUserByRegistrationToken(
  registrationToken: string,
): Promise<UserRegistrationRecord | null> {
  const result = await dbQuery<UserRow>(
    `
      select
        id,
        email,
        display_name,
        role,
        status,
        password_hash,
        registration_token,
        approved_at,
        activated_at,
        rejection_reason,
        created_at
      from app_users
      where registration_token = $1
      limit 1
    `,
    [registrationToken],
  );

  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function countPendingApprovals(): Promise<number> {
  const result = await dbQuery<{ count: string }>(
    `
      select count(*)::text as count
      from app_users
      where status = 'pending_approval'
    `,
  );

  return Number(result.rows[0]?.count ?? "0");
}

export async function listUsersForAdmin(): Promise<AppUser[]> {
  const result = await dbQuery<UserRow>(
    `
      select
        id,
        email,
        display_name,
        role,
        status,
        password_hash,
        registration_token,
        approved_at,
        activated_at,
        rejection_reason,
        created_at
      from app_users
      order by
        case status
          when 'pending_approval' then 0
          when 'approved_setup_pending' then 1
          when 'active' then 2
          else 3
        end,
        created_at desc
    `,
  );

  return result.rows.map(mapUser);
}

export async function registerUserRequest(input: {
  email: string;
  displayName: string;
}): Promise<{ token: string; status: AppUserStatus }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!email || !displayName) {
    throw new Error("missing_fields");
  }

  const existingResult = await dbQuery<UserRow>(
    `
      select
        id,
        email,
        display_name,
        role,
        status,
        password_hash,
        registration_token,
        approved_at,
        activated_at,
        rejection_reason,
        created_at
      from app_users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  const existing = existingResult.rows[0];
  if (existing) {
    if (existing.status === "active") {
      throw new Error("already_active");
    }

    if (existing.status === "rejected") {
      throw new Error("rejected");
    }

    const token = existing.registration_token ?? generateRegistrationToken();
    await dbQuery(
      `
        update app_users
        set display_name = $2,
            registration_token = $3,
            updated_at = now()
        where id = $1
      `,
      [existing.id, displayName, token],
    );

    return { token, status: existing.status };
  }

  const token = generateRegistrationToken();
  await dbQuery(
    `
      insert into app_users (
        email,
        password_hash,
        display_name,
        role,
        status,
        registration_token
      )
      values ($1, null, $2, 'member', 'pending_approval', $3)
    `,
    [email, displayName, token],
  );

  return { token, status: "pending_approval" };
}

export async function approveUserRequest(input: {
  userId: number;
  approvedByUserId: number;
  role: AppUserRole;
}): Promise<void> {
  await dbQuery(
    `
      update app_users
      set role = $2,
          status = 'approved_setup_pending',
          approved_at = now(),
          approved_by_user_id = $3,
          rejection_reason = null,
          updated_at = now()
      where id = $1
        and status = 'pending_approval'
    `,
    [input.userId, input.role, input.approvedByUserId],
  );
}

export async function rejectUserRequest(input: {
  userId: number;
  reason?: string;
}): Promise<void> {
  await dbQuery(
    `
      update app_users
      set status = 'rejected',
          rejection_reason = $2,
          updated_at = now()
      where id = $1
        and status in ('pending_approval', 'approved_setup_pending')
    `,
    [input.userId, input.reason?.trim() || "Registration was not approved."],
  );
}

export async function updateUserRole(input: {
  userId: number;
  role: AppUserRole;
}): Promise<void> {
  if (input.role === "member") {
    const existing = await dbQuery<UserRow>(
      `
        select
          id,
          email,
          display_name,
          role,
          status,
          password_hash,
          registration_token,
          approved_at,
          activated_at,
          rejection_reason,
          created_at
        from app_users
        where id = $1
        limit 1
      `,
      [input.userId],
    );

    const row = existing.rows[0];
    if (row?.role === "admin" && row.status === "active") {
      const countResult = await dbQuery<{ count: string }>(
        `
          select count(*)::text as count
          from app_users
          where role = 'admin'
            and status = 'active'
        `,
      );

      if (Number(countResult.rows[0]?.count ?? "0") <= 1) {
        throw new Error("last_admin");
      }
    }
  }

  await dbQuery(
    `
      update app_users
      set role = $2,
          updated_at = now()
      where id = $1
        and status = 'active'
    `,
    [input.userId, input.role],
  );
}

export async function completeUserSetup(input: {
  registrationToken: string;
  displayName: string;
  password: string;
}): Promise<void> {
  const registrationToken = input.registrationToken.trim();
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!registrationToken || !displayName || !password) {
    throw new Error("missing_fields");
  }

  const passwordHash = await hash(password, 12);
  const result = await dbQuery(
    `
      update app_users
      set display_name = $2,
          password_hash = $3,
          status = 'active',
          activated_at = now(),
          registration_token = null,
          rejection_reason = null,
          updated_at = now()
      where registration_token = $1
        and status = 'approved_setup_pending'
    `,
    [registrationToken, displayName, passwordHash],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("not_ready");
  }
}
