import { Link } from "@tanstack/react-router";
import { Price } from "@/components/price";
import { LazyImage } from "@/components/lazy-image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  index = 0,
  showDesigner = true,
}: {
  product: Product;
  index?: number;
  showDesigner?: boolean;
}) {
  const image = product.imageUrls[0] ?? "/images/products/studio-2.jpg";
  return (
    <Link
      to="/shop/$slug"
      params={{ slug: product.slug }}
      className="group block rise-in"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <LazyImage
        src={image}
        alt={product.name}
        width={900}
        eager={index < 6}
        className="relative aspect-portrait rounded-xl"
        imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <div className="mt-3.5 px-0.5">
        {showDesigner && (
          <p className="mb-1 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-400">
            {product.designer.name}
          </p>
        )}
        <h3 className="font-serif text-[15px] font-medium leading-snug text-charcoal-800 transition-colors group-hover:text-charcoal-600">
          {product.name}
        </h3>
        <Price cents={product.priceCents} className="mt-1.5 block text-sm text-charcoal-700" />
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  showDesigner = true,
  className,
}: {
  products: Product[];
  showDesigner?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10",
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={`${product.slug}-${index}`}
          product={product}
          index={index}
          showDesigner={showDesigner}
        />
      ))}
    </div>
  );
}
