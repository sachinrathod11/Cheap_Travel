import assert from "node:assert/strict";
import { locationFailure, LocationServiceError } from "../lib/location-errors.ts";

assert.equal(locationFailure({ code: "42P01" }).code, "database_migration_required");
assert.equal(locationFailure({ code: "ECONNREFUSED" }).code, "database_unavailable");
assert.deepEqual(locationFailure(new LocationServiceError("map_http_403", "Map access refused")), {
  code: "map_http_403", error: "Map access refused",
});
assert.equal(JSON.stringify(locationFailure(new Error("postgresql://secret"))).includes("secret"), false);
