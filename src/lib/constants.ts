export const APP_NAME = "Drapé Collective";
export const APP_TAGLINE = "Where fashion finds its future";
export const CONTACT_EMAIL = "drapecollective2@gmail.com";

export const PRODUCT_CATEGORIES = [
  "Ready-to-Wear",
  "Evening",
  "Outerwear",
  "Knitwear",
  "Denim",
  "Accessories",
  "Jewelry",
  "Bags",
  "Footwear",
  "Avant-Garde",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "One Size",
] as const;

export const MAX_PHOTOS_PER_PIECE = 5;
export const ATELIER_BIO_MAX = 280;

export const STUDIO_COVERS = [
  { id: "studio-1", url: "/images/products/studio-1.jpg", label: "Atelier rail" },
  { id: "studio-2", url: "/images/products/studio-2.jpg", label: "Cloth study" },
  { id: "studio-3", url: "/images/products/studio-3.jpg", label: "Tailoring" },
  { id: "studio-4", url: "/images/products/studio-4.jpg", label: "Editorial" },
] as const;

export const QUIZ = [
  {
    id: "silhouette",
    question: "What silhouette speaks to you?",
    options: [
      { value: "structured", label: "Structured & tailored", tags: ["structured", "tailored"] },
      { value: "flowing", label: "Flowing & fluid", tags: ["fluid", "romantic"] },
      { value: "oversized", label: "Oversized & relaxed", tags: ["relaxed", "everyday"] },
      { value: "sculptural", label: "Sculptural & bold", tags: ["sculptural", "evening"] },
    ],
  },
  {
    id: "color",
    question: "Which color story captivates you?",
    options: [
      { value: "monochrome", label: "Monochrome minimal", tags: ["monochrome", "minimal"] },
      { value: "earth", label: "Warm earth tones", tags: ["earth", "sustainable"] },
      { value: "ivory", label: "Ivory & champagne", tags: ["ivory", "evening"] },
      { value: "bold", label: "Bold & saturated", tags: ["bold", "party"] },
    ],
  },
  {
    id: "material",
    question: "What material calls to you?",
    options: [
      { value: "cotton", label: "Organic cotton & linen", tags: ["cotton", "everyday"] },
      { value: "silk", label: "Silk & satin", tags: ["silk", "evening"] },
      { value: "wool", label: "Wool & tailoring cloth", tags: ["wool", "tailored"] },
      { value: "reclaimed", label: "Reclaimed & hand-worked", tags: ["sustainable", "denim"] },
    ],
  },
  {
    id: "vibe",
    question: "What vibe defines your style?",
    options: [
      { value: "editorial", label: "Editorial & polished", tags: ["editorial", "structured"] },
      { value: "effortless", label: "Effortlessly cool", tags: ["relaxed", "everyday"] },
      { value: "romantic", label: "Romantic & dreamy", tags: ["romantic", "fluid"] },
      { value: "rebel", label: "Rebel & edged", tags: ["bold", "avant"] },
    ],
  },
  {
    id: "occasion",
    question: "Where will you wear it most?",
    options: [
      { value: "everyday", label: "Everyday elevated", tags: ["everyday", "ready-to-wear"] },
      { value: "evening", label: "Evening & events", tags: ["evening", "party"] },
      { value: "studio", label: "Studio & creative", tags: ["avant", "sculptural"] },
      { value: "ceremony", label: "Ceremony & commission", tags: ["bridal", "ivory"] },
    ],
  },
] as const;
