import "server-only";

import type { QueryResultRow } from "pg";
import { dbQuery } from "./index";

const GOOGLE_CONNECTION_KEY = "business_profile";

export interface GoogleOAuthConnection {
  connectionKey: string;
  googleUserId: string;
  googleEmail: string;
  googleName: string;
  scope: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  connectedByUserId: number;
  lastValidatedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoogleOAuthConnectionRow extends QueryResultRow {
  connection_key: string;
  google_user_id: string;
  google_email: string;
  google_name: string;
  scope: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | Date | null;
  connected_by_user_id: number;
  last_validated_at: string | Date | null;
  last_error: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function toIsoString(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapConnection(row: GoogleOAuthConnectionRow): GoogleOAuthConnection {
  return {
    connectionKey: row.connection_key,
    googleUserId: row.google_user_id,
    googleEmail: row.google_email,
    googleName: row.google_name,
    scope: row.scope,
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessTokenExpiresAt: toIsoString(row.access_token_expires_at),
    connectedByUserId: row.connected_by_user_id,
    lastValidatedAt: toIsoString(row.last_validated_at),
    lastError: row.last_error,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function getGoogleOAuthConnection(): Promise<GoogleOAuthConnection | null> {
  const result = await dbQuery<GoogleOAuthConnectionRow>(
    `
      select
        connection_key,
        google_user_id,
        google_email,
        google_name,
        scope,
        refresh_token,
        access_token,
        access_token_expires_at,
        connected_by_user_id,
        last_validated_at,
        last_error,
        created_at,
        updated_at
      from google_oauth_connections
      where connection_key = $1
      limit 1
    `,
    [GOOGLE_CONNECTION_KEY],
  );

  const row = result.rows[0];
  return row ? mapConnection(row) : null;
}

export async function upsertGoogleOAuthConnection(input: {
  googleUserId: string;
  googleEmail: string;
  googleName: string;
  scope: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  connectedByUserId: number;
  lastValidatedAt?: string | null;
  lastError?: string | null;
}): Promise<void> {
  await dbQuery(
    `
      insert into google_oauth_connections (
        connection_key,
        google_user_id,
        google_email,
        google_name,
        scope,
        refresh_token,
        access_token,
        access_token_expires_at,
        connected_by_user_id,
        last_validated_at,
        last_error
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      on conflict (connection_key)
      do update
      set google_user_id = excluded.google_user_id,
          google_email = excluded.google_email,
          google_name = excluded.google_name,
          scope = excluded.scope,
          refresh_token = excluded.refresh_token,
          access_token = excluded.access_token,
          access_token_expires_at = excluded.access_token_expires_at,
          connected_by_user_id = excluded.connected_by_user_id,
          last_validated_at = excluded.last_validated_at,
          last_error = excluded.last_error,
          updated_at = now()
    `,
    [
      GOOGLE_CONNECTION_KEY,
      input.googleUserId,
      input.googleEmail,
      input.googleName,
      input.scope,
      input.refreshToken,
      input.accessToken,
      input.accessTokenExpiresAt,
      input.connectedByUserId,
      input.lastValidatedAt ?? null,
      input.lastError ?? null,
    ],
  );
}

export async function updateGoogleOAuthAccessToken(input: {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  scope: string;
}): Promise<void> {
  await dbQuery(
    `
      update google_oauth_connections
      set access_token = $2,
          access_token_expires_at = $3,
          scope = $4,
          updated_at = now()
      where connection_key = $1
    `,
    [GOOGLE_CONNECTION_KEY, input.accessToken, input.accessTokenExpiresAt, input.scope],
  );
}

export async function markGoogleOAuthValidationSuccess(): Promise<void> {
  await dbQuery(
    `
      update google_oauth_connections
      set last_validated_at = now(),
          last_error = null,
          updated_at = now()
      where connection_key = $1
    `,
    [GOOGLE_CONNECTION_KEY],
  );
}

export async function markGoogleOAuthValidationError(error: string): Promise<void> {
  await dbQuery(
    `
      update google_oauth_connections
      set last_error = $2,
          updated_at = now()
      where connection_key = $1
    `,
    [GOOGLE_CONNECTION_KEY, error],
  );
}

export async function deleteGoogleOAuthConnection(): Promise<void> {
  await dbQuery(
    `
      delete from google_oauth_connections
      where connection_key = $1
    `,
    [GOOGLE_CONNECTION_KEY],
  );
}
