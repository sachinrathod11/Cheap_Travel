export class LocationServiceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export function locationFailure(error: unknown) {
  if (error instanceof LocationServiceError)
    return { code: error.code, error: error.message };
  const code = (error as { code?: string } | null)?.code;
  if (code === "42P01")
    return { code: "database_migration_required", error: "Hotel location storage is missing. Run npm run db:init, then retry." };
  if (["ECONNREFUSED", "ENOTFOUND", "28P01", "3D000"].includes(code || ""))
    return { code: "database_unavailable", error: "Cannot connect to the hotel location database. Start PostgreSQL and check DATABASE_URL, then retry." };
  return { code: "location_unavailable", error: "Hotel location discovery failed. Check the server terminal for the diagnostic code, then retry." };
}
