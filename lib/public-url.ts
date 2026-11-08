export function publicWebsite(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const u = new URL(value.includes("://") ? value : `https://${value}`);
    const host = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      !host.includes(".") ||
      host.startsWith("[") ||
      /^\d+(\.\d+){3}$/.test(host) ||
      host === "localhost" ||
      /\.(local|localhost|internal)$/.test(host)
    )
      return null;
    if (
      [...u.searchParams.keys()].some((k) =>
        /^(access_token|token|password|session|sessionid|sid|auth|email)$/i.test(
          k,
        ),
      )
    )
      return null;
    return u.href;
  } catch {
    return null;
  }
}
