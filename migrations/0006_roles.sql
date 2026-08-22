create table if not exists user_roles (
  user_id text primary key,
  email text,
  role text not null check (role in ('client', 'designer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_email_idx on user_roles (lower(email));
