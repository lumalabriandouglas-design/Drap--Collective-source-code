import { Link } from "@tanstack/react-router";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function showroomPath(slug: string) {
  return `/s/${slug}`;
}

export function showroomHref(slug: string) {
  if (typeof window === "undefined") return showroomPath(slug);
  return `${window.location.origin}${showroomPath(slug)}`;
}

export async function copyShowroomLink(slug: string) {
  const url = showroomHref(slug);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    return url;
  } catch {
    throw new Error(url);
  }
}

export function ShowroomShareCard({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);
  const href = showroomHref(slug);
  const display = href.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await copyShowroomLink(slug);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      toast.message(err instanceof Error ? err.message : href);
    }
  }

  return (
    <div className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-5 sm:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">Your page</p>
      <p className="mt-2 font-serif text-2xl text-charcoal-800">{name}</p>
      <p className="mt-2 text-sm font-light leading-relaxed text-charcoal-500">
        Send this link. People see only your clothes.
      </p>
      <p className="mt-4 break-all text-xs tracking-wide text-charcoal-400">{display}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button asChild variant="outline">
          <Link to="/s/$slug" params={{ slug }}>
            Open page
          </Link>
        </Button>
      </div>
    </div>
  );
}
