import "server-only";

import { hash } from "bcryptjs";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { seedStores } from "@data/stores";

declare global {
  var __reviewsMonitorPool: Pool | undefined;
  var __reviewsMonitorDbInitPromise: Promise<void> | undefined;
}

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and update the Postgres settings.",
    );
  }
  return value;
}

function getDatabaseSsl():
  | false
  | {
      rejectUnauthorized: false;
    } {
  return process.env.DATABASE_SSL?.trim() === "require"
    ? { rejectUnauthorized: false }
    : false;
}

function getPool(): Pool {
  if (!globalThis.__reviewsMonitorPool) {
    globalThis.__reviewsMonitorPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: process.env.NODE_ENV === "production" ? 10 : 5,
      ssl: getDatabaseSsl(),
    });
  }
  return globalThis.__reviewsMonitorPool;
}

function getBootstrapAdminConfig() {
  return {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD?.trim(),
    name: process.env.ADMIN_NAME?.trim() || "Initial Admin",
  };
}

async function bootstrapAdmin(client: PoolClient): Promise<void> {
  const admin = getBootstrapAdminConfig();
  if (!admin.email || !admin.password) {
    return;
  }

  const existing = await client.query<{ id: number; password_hash: string | null }>(
    "select id, password_hash from app_users where lower(email) = lower($1) limit 1",
    [admin.email],
  );

  const passwordHash = await hash(admin.password, 12);

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      `
        update app_users
        set display_name = $2,
            password_hash = coalesce(password_hash, $3),
            role = 'admin',
            status = 'active',
            registration_token = null,
            rejection_reason = null,
            updated_at = now()
        where id = $1
      `,
      [existing.rows[0].id, admin.name, passwordHash],
    );
    return;
  }

  await client.query(
    `
      insert into app_users (email, password_hash, display_name, role, status)
      values ($1, $2, $3, 'admin', 'active')
    `,
    [admin.email, passwordHash, admin.name],
  );
}

async function bootstrapStores(client: PoolClient): Promise<void> {
  const countResult = await client.query<{ count: string }>(
    "select count(*)::text as count from stores",
  );
  const count = Number(countResult.rows[0]?.count ?? "0");

  if (count > 0) {
    return;
  }

  for (const store of seedStores) {
    await client.query(
      `
        insert into stores (
          slug,
          display_name,
          city,
          region,
          manager_name,
          google_place_id,
          google_location_name,
          google_account_resource_name,
          is_active,
          address,
          google_maps_url,
          notes,
          public_rating,
          public_review_count,
          last_review_sync_status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, true, '', '', null, null, null, 'never')
      `,
      [
        store.id,
        store.displayName,
        store.city,
        store.region,
        store.managerName,
        store.googlePlaceId,
        store.googleLocationName ?? null,
        store.googleAccountResourceName ?? null,
      ],
    );
  }
}

async function initializeDatabase(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      create table if not exists app_users (
        id bigserial primary key,
        email text not null,
        password_hash text,
        display_name text not null,
        role text not null default 'member',
        status text not null default 'active',
        registration_token text,
        approved_at timestamptz,
        approved_by_user_id bigint,
        activated_at timestamptz,
        rejection_reason text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await client.query(`
      alter table app_users
      alter column password_hash drop not null
    `);

    await client.query(`
      alter table app_users
      add column if not exists status text not null default 'active'
    `);

    await client.query(`
      alter table app_users
      add column if not exists registration_token text
    `);

    await client.query(`
      alter table app_users
      add column if not exists approved_at timestamptz
    `);

    await client.query(`
      alter table app_users
      add column if not exists approved_by_user_id bigint
    `);

    await client.query(`
      alter table app_users
      add column if not exists activated_at timestamptz
    `);

    await client.query(`
      alter table app_users
      add column if not exists rejection_reason text
    `);

    await client.query(`
      create unique index if not exists app_users_email_lower_unique
      on app_users ((lower(email)))
    `);

    await client.query(`
      create unique index if not exists app_users_registration_token_unique
      on app_users (registration_token)
      where registration_token is not null
    `);

    await client.query(`
      create table if not exists stores (
        id bigserial primary key,
        slug text not null,
        display_name text not null,
        city text not null,
        region text not null,
        manager_name text not null,
        google_place_id text not null default '',
        google_location_name text,
        google_account_resource_name text,
        is_active boolean not null default true,
        address text not null default '',
        google_maps_url text not null default '',
        notes text,
        public_rating numeric(3, 1),
        public_review_count integer,
        last_review_sync_at timestamptz,
        last_review_sync_status text not null default 'never',
        last_review_sync_error text,
        last_review_source_mode text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await client.query(`
      alter table stores
      add column if not exists address text not null default ''
    `);

    await client.query(`
      alter table stores
      add column if not exists google_maps_url text not null default ''
    `);

    await client.query(`
      alter table stores
      add column if not exists notes text
    `);

    await client.query(`
      alter table stores
      add column if not exists public_rating numeric(3, 1)
    `);

    await client.query(`
      alter table stores
      add column if not exists public_review_count integer
    `);

    await client.query(`
      alter table stores
      add column if not exists last_review_sync_at timestamptz
    `);

    await client.query(`
      alter table stores
      add column if not exists last_review_sync_status text not null default 'never'
    `);

    await client.query(`
      alter table stores
      add column if not exists last_review_sync_error text
    `);

    await client.query(`
      alter table stores
      add column if not exists last_review_source_mode text
    `);

    await client.query(`
      create unique index if not exists stores_slug_lower_unique
      on stores ((lower(slug)))
    `);

    await client.query(`
      create index if not exists stores_is_active_idx
      on stores (is_active)
    `);

    await client.query(`
      create table if not exists google_oauth_connections (
        connection_key text primary key,
        google_user_id text not null,
        google_email text not null,
        google_name text not null,
        scope text not null,
        refresh_token text not null,
        access_token text,
        access_token_expires_at timestamptz,
        connected_by_user_id bigint not null,
        last_validated_at timestamptz,
        last_error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await client.query(`
      create table if not exists review_sync_runs (
        id bigserial primary key,
        trigger_type text not null,
        triggered_by_user_id bigint,
        provider_mode text,
        status text not null default 'running',
        stores_total integer not null default 0,
        stores_succeeded integer not null default 0,
        stores_failed integer not null default 0,
        reviews_upserted integer not null default 0,
        summary_message text,
        error_json jsonb,
        started_at timestamptz not null default now(),
        finished_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await client.query(`
      create index if not exists review_sync_runs_started_at_idx
      on review_sync_runs (started_at desc)
    `);

    await client.query(`
      create table if not exists reviews (
        id bigserial primary key,
        store_id bigint not null references stores(id) on delete cascade,
        external_review_id text not null,
        author_name text not null,
        author_photo_url text,
        rating integer not null default 0,
        text text not null default '',
        relative_time_description text,
        publish_time timestamptz,
        source_updated_at timestamptz,
        sentiment text not null,
        status text not null,
        suggested_reply text not null default '',
        last_seen_at timestamptz not null default now(),
        raw_json jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await client.query(`
      create unique index if not exists reviews_store_external_id_unique
      on reviews (store_id, external_review_id)
    `);

    await client.query(`
      create index if not exists reviews_store_publish_time_idx
      on reviews (store_id, publish_time desc)
    `);

    await client.query(`
      create table if not exists review_replies (
        review_id bigint primary key references reviews(id) on delete cascade,
        reply_comment text not null,
        reply_updated_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await bootstrapAdmin(client);
    await bootstrapStores(client);
  } finally {
    client.release();
  }
}

export async function ensureAppDatabase(): Promise<void> {
  if (!globalThis.__reviewsMonitorDbInitPromise) {
    globalThis.__reviewsMonitorDbInitPromise = initializeDatabase().catch((error) => {
      globalThis.__reviewsMonitorDbInitPromise = undefined;
      throw error;
    });
  }

  await globalThis.__reviewsMonitorDbInitPromise;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  await ensureAppDatabase();
  return getPool().query<T>(text, values);
}

export async function withDbClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureAppDatabase();
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function dbTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  return withDbClient(async (client) => {
    await client.query("begin");
    try {
      const result = await callback(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
