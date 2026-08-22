export type Designer = {
  id: number;
  slug: string;
  name: string;
  city: string;
  country: string;
  bio: string;
  philosophy: string | null;
  imageUrl: string;
  featured: boolean;
  userId: string | null;
  pieceCount: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  materials: string[];
  sizes: string[];
  imageUrls: string[];
  tags: string[];
  leadTime: string | null;
  featured: boolean;
  listedBy: string | null;
  designer: Pick<Designer, "id" | "slug" | "name" | "city" | "country" | "imageUrl">;
};

export type Lookbook = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string;
  body: string;
  productSlugs: string[];
  designerSlug: string | null;
  designerName: string | null;
};

export type OrderSummary = {
  id: number;
  status: string;
  totalCents: number;
  currency: string;
  shippingName: string;
  shippingCity: string;
  shippingCountry: string;
  createdAt: string;
  items: {
    name: string;
    designerName: string;
    size: string;
    qty: number;
    priceCents: number;
    imageUrl: string | null;
  }[];
};

export type AtelierProfile = {
  id: number;
  slug: string;
  name: string;
  city: string;
  country: string;
  bio: string;
};
