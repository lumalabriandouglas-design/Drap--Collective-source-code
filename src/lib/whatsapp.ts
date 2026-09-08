export function digitsFromWhatsApp(raw: string | null | undefined) {
  if (!raw) return "";
  let value = raw.trim();
  const waMe = value.match(/(?:wa\.me|whatsapp\.com\/send\/?\?phone=)\/?(\d+)/i);
  if (waMe) return waMe[1];
  if (value.toLowerCase().startsWith("wa:")) value = value.slice(3);
  let digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("0") && digits.length === 10) digits = `256${digits.slice(1)}`;
  if (digits.length < 9) return "";
  return digits;
}

export function storeWhatsApp(raw: string) {
  const digits = digitsFromWhatsApp(raw);
  return digits ? `wa:${digits}` : "";
}

export function waLink(raw: string | null | undefined) {
  const digits = digitsFromWhatsApp(raw);
  return digits ? `https://wa.me/${digits}` : "";
}

export function displayWhatsApp(raw: string | null | undefined) {
  const digits = digitsFromWhatsApp(raw);
  if (!digits) return "";
  if (digits.startsWith("256") && digits.length === 12) {
    return `+256 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits}`;
}

export function pieceWhatsAppNote(house: string, piece?: { name?: string; slug?: string } | null) {
  if (!piece?.name) return `Hello ${house} — I saw your house on Drapé Collective.`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.odrapecollective.com";
  const url = piece.slug ? ` ${origin}/shop/${piece.slug}` : "";
  return `Hello ${house} — I am writing about ${piece.name}.${url}`;
}

export function whatsappHref(raw: string | null | undefined, house: string, piece?: { name?: string; slug?: string } | null) {
  const link = waLink(raw);
  if (!link) return "";
  return `${link}?text=${encodeURIComponent(pieceWhatsAppNote(house, piece))}`;
}
