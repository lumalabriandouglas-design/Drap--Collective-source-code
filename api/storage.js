export default function handler(_req, res) {
  const access = String(process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim();
  const secret = String(
    process.env.R2_SECRET_ACCESS_KEY ||
      process.env.R2_SECRET_KEY ||
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      "",
  ).trim();
  const publicBase = String(process.env.R2_PUBLIC_BASE || process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_BASE || "")
    .trim()
    .replace(/\/$/, "");
  const keys = Boolean(access && secret);
  const publicUrl = Boolean(publicBase && !publicBase.includes(".r2.cloudflarestorage.com"));
  const missing = [];
  if (!keys) {
    missing.push("R2_ACCESS_KEY_ID");
    missing.push("R2_SECRET_ACCESS_KEY");
  }
  if (!publicUrl) missing.push("R2_PUBLIC_BASE");
  const payload = JSON.stringify({
    r2: keys && publicUrl,
    account: true,
    bucket: true,
    keys,
    publicUrl,
    preview: !(keys && publicUrl),
    missing,
  });
  if (res && typeof res.end === "function") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(payload);
    return;
  }
  return new Response(payload, {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
