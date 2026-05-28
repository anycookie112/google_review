import "server-only";

import {
  getGoogleOAuthConnection,
  markGoogleOAuthValidationError,
  markGoogleOAuthValidationSuccess,
  updateGoogleOAuthAccessToken,
  type GoogleOAuthConnection,
} from "@/lib/db/googleConnection";
import {
  listGoogleBusinessAccounts,
  refreshGoogleAccessToken,
  type GoogleBusinessAccount,
} from "./oauth";

export async function getGoogleConnectionWithAccounts(): Promise<{
  connection: GoogleOAuthConnection | null;
  accounts: GoogleBusinessAccount[];
  error: string | null;
}> {
  const connection = await getGoogleOAuthConnection();
  if (!connection) {
    return { connection: null, accounts: [], error: null };
  }

  try {
    const accessToken = await getUsableGoogleAccessToken(connection);
    const accounts = await listGoogleBusinessAccounts(accessToken);
    await markGoogleOAuthValidationSuccess();
    return { connection: await getGoogleOAuthConnection(), accounts, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google validation failed.";
    await markGoogleOAuthValidationError(message);
    return { connection: await getGoogleOAuthConnection(), accounts: [], error: message };
  }
}

export async function getUsableGoogleAccessToken(
  connection: GoogleOAuthConnection,
): Promise<string> {
  const skewMs = 60_000;
  if (
    connection.accessToken &&
    connection.accessTokenExpiresAt &&
    new Date(connection.accessTokenExpiresAt).getTime() > Date.now() + skewMs
  ) {
    return connection.accessToken;
  }

  const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
  await updateGoogleOAuthAccessToken({
    accessToken: refreshed.accessToken,
    accessTokenExpiresAt: refreshed.expiresAt,
    scope: refreshed.scope || connection.scope,
  });

  return refreshed.accessToken;
}
