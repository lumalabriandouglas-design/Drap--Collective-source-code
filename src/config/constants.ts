export const APP_NAME = 'Drapé Collective';
export const APP_TAGLINE = 'Discover Independent Fashion';

export const PRODUCT_CATEGORIES = [
  'Ready-to-Wear',
  'Avant-Garde',
  'Accessories',
  'Footwear',
  'Jewelry',
  'Bags',
  'Outerwear',
  'Knitwear',
  'Denim',
  'Evening',
  'Beachwear',
  'Activewear',
] as const;

export const PRODUCT_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  'One Size',
  'EU 34', 'EU 36', 'EU 38', 'EU 40', 'EU 42', 'EU 44',
] as const;

export const STYLE_TAGS = [
  'Minimalist',
  'Avant-Garde',
  'Bohemian',
  'Streetwear',
  'Classic',
  'Romantic',
  'Edgy',
  'Sustainable',
  'Vintage-Inspired',
  'Geometric',
  'Fluid',
  'Bold',
  'Neutral',
  'Monochrome',
  'Layered',
] as const;

export const QUIZ_QUESTIONS = [
  {
    id: 'silhouette',
    question: 'What silhouette speaks to you?',
    options: [
      { value: 'structured', label: 'Structured & Tailored', emoji: '▬' },
      { value: 'flowing', label: 'Flowing & Fluid', emoji: '〜' },
      { value: 'oversized', label: 'Oversized & Relaxed', emoji: '◻' },
      { value: 'cropped', label: 'Cropped & Bold', emoji: '◈' },
    ],
  },
  {
    id: 'color',
    question: 'Which color story captivates you?',
    options: [
      { value: 'monochrome', label: 'Monochrome Minimal' },
      { value: 'earth', label: 'Warm Earth Tones' },
      { value: 'pastel', label: 'Soft Pastels' },
      { value: 'bold', label: 'Bold & Vibrant' },
    ],
  },
  {
    id: 'material',
    question: 'What material calls to you?',
    options: [
      { value: 'cotton', label: 'Organic Cotton & Linen' },
      { value: 'silk', label: 'Silk & Satin' },
      { value: 'denim', label: 'Denim & Canvas' },
      { value: 'vegan', label: 'Vegan Leather & Tech Fabrics' },
    ],
  },
  {
    id: 'vibe',
    question: 'What vibe defines your style?',
    options: [
      { value: 'editorial', label: 'Editorial & Polished' },
      { value: 'effortless', label: 'Effortlessly Cool' },
      { value: 'romantic', label: 'Romantic & Dreamy' },
      { value: 'rebel', label: 'Rebel & Edgy' },
    ],
  },
  {
    id: 'occasion',
    question: 'Where will you wear it most?',
    options: [
      { value: 'everyday', label: 'Everyday Elevated' },
      { value: 'evening', label: 'Evening & Events' },
      { value: 'studio', label: 'Studio & Creative' },
      { value: 'travel', label: 'Travel & Adventure' },
    ],
  },
];

export const ONBOARDING_STEPS = [
  { step: 1, title: 'Welcome', description: 'Tell us about your brand' },
  { step: 2, title: 'Design Philosophy', description: 'What drives your creativity' },
  { step: 3, title: 'Your Materials', description: 'The fabrics and materials you work with' },
  { step: 4, title: 'Portfolio', description: 'Upload your first pieces' },
  { step: 5, title: 'Almost There', description: 'Review and submit' },
];

export const NAV_ITEMS = [
  { label: 'Explore', path: '/explore', icon: 'Compass' },
  { label: 'Feed', path: '/feed', icon: 'LayoutGrid' },
  { label: 'Saved', path: '/saved', icon: 'Heart' },
  { label: 'Messages', path: '/messages', icon: 'MessageSquare' },
] as const;

export const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://drape-collective.com';