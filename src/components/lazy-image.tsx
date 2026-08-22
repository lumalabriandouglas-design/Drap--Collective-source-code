import { useState } from "react";
import { displayImage, type ImageWidth } from "@/lib/media";
import { cn } from "@/lib/utils";

export function LazyImage({
  src,
  alt,
  width = 900,
  className,
  imgClassName,
  eager = false,
}: {
  src: string;
  alt: string;
  width?: ImageWidth;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const display = failed ? src : displayImage(src, width);
  return (
    <div className={cn("overflow-hidden bg-ivory-100", className)}>
      <img
        src={display}
        alt={alt}
        className={cn("img-cover", imgClassName)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
