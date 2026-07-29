import { Link } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import LazyImage from './LazyImage';
import { optimizeImageUrl } from '../../lib/imageUrl';
import type { Product, Profile } from '../../types/supabase';

interface ProductCardProps {
  product: Product & { designer?: Profile | null };
  index?: number;
  showDesigner?: boolean;
}

export default function ProductCard({
  product,
  index = 0,
  showDesigner = true,
}: ProductCardProps) {
  const { formatPrice } = useCurrency();

  const imageUrl = product.image_urls?.[0] || '';
  const designerName =
    product.designer?.brand_name ||
    product.designer?.username ||
    'Independent Designer';

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ivory-50">
        <LazyImage
          src={optimizeImageUrl(imageUrl)}
          alt={product.name}
          className="w-full h-full"
          imgClassName="group-hover:scale-[1.04] transition-transform duration-700 ease-out"
          loading={index < 6 ? 'eager' : 'lazy'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      <div className="mt-3.5 px-0.5">
        {showDesigner && (
          <p className="text-[11px] tracking-[0.08em] uppercase text-charcoal-400 font-medium mb-1 truncate">
            {designerName}
          </p>
        )}

        <h3 className="font-serif text-[15px] font-medium text-charcoal-800 leading-snug line-clamp-2 group-hover:text-charcoal-600 transition-colors">
          {product.name}
        </h3>

        <p className="text-sm font-medium text-charcoal-700 mt-1.5 tracking-tight">
          {product.price != null ? formatPrice(product.price) : 'Price on request'}
        </p>
      </div>
    </Link>
  );
}