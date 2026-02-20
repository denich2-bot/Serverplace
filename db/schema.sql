-- providers
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  logo_hint_type TEXT DEFAULT 'initials',
  logo_hint_text TEXT DEFAULT '',
  logo_hint_seed TEXT DEFAULT '',
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  has_free_trial INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 0,
  regions TEXT DEFAULT '[]',          -- JSON array
  cpu_brands TEXT DEFAULT '[]',       -- JSON array
  support_email TEXT DEFAULT '',
  support_phone TEXT DEFAULT '',
  promo_label TEXT DEFAULT '',
  promo_discount_percent INTEGER DEFAULT 0,
  promo_until TEXT DEFAULT '',
  about_short TEXT DEFAULT '',
  aliases TEXT DEFAULT '[]',          -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_providers_slug ON providers(slug);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON providers(rating DESC);

-- offers
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  name TEXT NOT NULL,
  billing TEXT DEFAULT 'month',
  currency TEXT DEFAULT 'RUB',
  market_price_month REAL NOT NULL,
  promo_price_month REAL NOT NULL,
  promo_label TEXT DEFAULT '',
  -- flattened resources for fast queries
  vcpu INTEGER DEFAULT 1,
  ram_gb INTEGER DEFAULT 1,
  cpu_type TEXT DEFAULT '',
  cpu_brand TEXT DEFAULT '',
  cpu_line TEXT DEFAULT '',
  cpu_model TEXT DEFAULT '',
  disk_system_type TEXT DEFAULT 'ssd',
  disk_system_size_gb INTEGER DEFAULT 25,
  disks_json TEXT DEFAULT '[]',        -- JSON full disks array
  bandwidth_mbps INTEGER DEFAULT 100,
  traffic_limit_tb REAL DEFAULT 1,
  ipv4_included INTEGER DEFAULT 1,
  ipv6_included INTEGER DEFAULT 0,
  ddos_protection INTEGER DEFAULT 0,
  sla_percent REAL DEFAULT 99.9,
  virtualization TEXT DEFAULT 'KVM',
  regions TEXT DEFAULT '[]',           -- JSON array
  pools TEXT DEFAULT '[]',             -- JSON array
  free_trial_available INTEGER DEFAULT 0,
  free_trial_days INTEGER DEFAULT 0,
  free_trial_conditions TEXT DEFAULT '',
  order_url TEXT DEFAULT '',
  docs_url TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_offers_provider ON offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_offers_vcpu ON offers(vcpu);
CREATE INDEX IF NOT EXISTS idx_offers_ram ON offers(ram_gb);
CREATE INDEX IF NOT EXISTS idx_offers_price ON offers(promo_price_month);
CREATE INDEX IF NOT EXISTS idx_offers_bandwidth ON offers(bandwidth_mbps);
CREATE INDEX IF NOT EXISTS idx_offers_trial ON offers(free_trial_available);

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  user_display_name TEXT NOT NULL,
  user_role TEXT DEFAULT '',
  rating REAL DEFAULT 5,
  title TEXT DEFAULT '',
  pros TEXT DEFAULT '[]',              -- JSON array
  cons TEXT DEFAULT '[]',              -- JSON array
  use_case TEXT DEFAULT '',
  text TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  verified INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);

-- leads
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT REFERENCES providers(id),
  offer_id TEXT REFERENCES offers(id),
  config_snapshot TEXT DEFAULT '{}',   -- JSON
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  utm TEXT DEFAULT '{}',               -- JSON
  page_url TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK(status IN ('new','sent','in_work','closed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- content pages (blog + faq)
CREATE TABLE IF NOT EXISTS content_pages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('article','faq','page')),
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content_md TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',              -- JSON array
  reading_time_min INTEGER DEFAULT 5,
  published_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_slug ON content_pages(slug);
CREATE INDEX IF NOT EXISTS idx_content_type ON content_pages(type);

-- regions
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'Россия',
  city TEXT DEFAULT ''
);
