create table if not exists designers (
  id serial primary key,
  slug text unique not null,
  name text not null,
  city text not null,
  country text not null,
  bio text not null,
  philosophy text,
  image_url text not null,
  user_id text unique,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  slug text unique not null,
  designer_id int not null references designers(id) on delete cascade,
  name text not null,
  description text not null,
  category text not null,
  price_cents int not null,
  materials jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  lead_time text,
  featured boolean not null default false,
  listed_by text,
  created_at timestamptz not null default now()
);

create index if not exists products_designer_id_idx on products (designer_id);
create index if not exists products_category_idx on products (category);
create index if not exists products_listed_by_idx on products (listed_by);

create table if not exists lookbooks (
  id serial primary key,
  slug text unique not null,
  title text not null,
  subtitle text,
  cover_url text not null,
  body text not null,
  product_slugs jsonb not null default '[]'::jsonb,
  designer_slug text,
  created_at timestamptz not null default now()
);

create table if not exists wishlist (
  user_id text not null,
  product_id int not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists orders (
  id serial primary key,
  user_id text not null,
  status text not null default 'confirmed',
  total_cents int not null,
  currency text not null default 'USD',
  shipping_name text not null,
  shipping_line1 text not null,
  shipping_city text not null,
  shipping_country text not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on orders (user_id);

create table if not exists order_items (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  product_id int,
  name text not null,
  designer_name text not null,
  size text not null,
  qty int not null,
  price_cents int not null,
  image_url text
);

create table if not exists inquiries (
  id serial primary key,
  user_id text not null,
  product_id int references products(id) on delete set null,
  designer_id int references designers(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_user_id_idx on inquiries (user_id);

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  role text not null default 'collector',
  atelier_id int references designers(id)
);
