-- ============================================================
-- DonateNow - Full Postgres Schema Migration
-- Compatible with Supabase / any Postgres 15+ with PostGIS + pgvector
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Enums
CREATE TYPE blood_group_enum AS ENUM (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

CREATE TYPE profile_status_enum AS ENUM (
  'active', 'throttled', 'suspended', 'blocked'
);

CREATE TYPE request_source_enum AS ENUM (
  'form', 'paste', 'voice'
);

CREATE TYPE request_status_enum AS ENUM (
  'open', 'partially_filled', 'fulfilled', 'closed', 'expired'
);

CREATE TYPE verification_state_enum AS ENUM (
  'unverified', 'slip_verified', 'peer_confirmed', 'low_trust'
);

CREATE TYPE urgency_enum AS ENUM (
  'routine', 'urgent', 'critical'
);

CREATE TYPE response_status_enum AS ENUM (
  'notified', 'accepted', 'declined', 'not_now', 'arrived'
);

CREATE TYPE confirmation_type_enum AS ENUM (
  'arrived', 'slip_verified', 'peer_vouched'
);

CREATE TYPE moderation_verdict_enum AS ENUM (
  'legit', 'spam', 'advertisement', 'payment_demand', 'abusive', 'fabricated'
);

CREATE TYPE moderation_action_enum AS ENUM (
  'warn', 'throttle', 'suspend', 'block', 'none'
);

-- ============================================================
-- 3. profiles
-- ============================================================
CREATE TABLE profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone             text UNIQUE NOT NULL,
  email             text,
  full_name         text,
  blood_group       blood_group_enum NOT NULL,
  geo               geography(Point, 4326),
  radius_km         numeric(5,1) NOT NULL DEFAULT 15.0,
  last_donated_at   timestamptz,
  available         boolean NOT NULL DEFAULT true,
  reputation        numeric(8,2) NOT NULL DEFAULT 0,
  response_stats    jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            profile_status_enum NOT NULL DEFAULT 'active',
  strikes           integer NOT NULL DEFAULT 0 CHECK (strikes >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Single profile type for every user. No roles.';
COMMENT ON COLUMN profiles.geo IS 'Coarse location only (privacy). Prefer geohash or low-precision point.';
COMMENT ON COLUMN profiles.response_stats IS 'Cached {response_rate, usual_hours, fatigue_score} for ranking.';

CREATE INDEX idx_profiles_blood_group ON profiles (blood_group);
CREATE INDEX idx_profiles_status ON profiles (status);
CREATE INDEX idx_profiles_available_eligible ON profiles (available, last_donated_at)
  WHERE available = true AND status = 'active';
CREATE INDEX idx_profiles_geo ON profiles USING GIST (geo);
CREATE INDEX idx_profiles_phone ON profiles (phone);

-- ============================================================
-- 4. hospitals
-- ============================================================
CREATE TABLE hospitals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  aliases     text[] NOT NULL DEFAULT '{}',
  geo         geography(Point, 4326) NOT NULL,
  city        text,
  region      text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hospitals IS 'Canonical hospital gazetteer for name normalization and distance calc.';

CREATE INDEX idx_hospitals_geo ON hospitals USING GIST (geo);
CREATE INDEX idx_hospitals_name_trgm ON hospitals USING GIN (name gin_trgm_ops); -- requires pg_trgm
CREATE INDEX idx_hospitals_aliases ON hospitals USING GIN (aliases);
CREATE INDEX idx_hospitals_active ON hospitals (is_active) WHERE is_active = true;

-- ============================================================
-- 5. requests
-- ============================================================
CREATE TABLE requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source              request_source_enum NOT NULL,
  raw_input           text,
  structured          jsonb NOT NULL DEFAULT '{}'::jsonb,
  blood_group         blood_group_enum NOT NULL,
  units_needed        integer NOT NULL CHECK (units_needed > 0),
  units_fulfilled     integer NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
  hospital_id         uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  needed_by           timestamptz,
  urgency             urgency_enum NOT NULL DEFAULT 'urgent',
  status              request_status_enum NOT NULL DEFAULT 'open',
  verification_state  verification_state_enum NOT NULL DEFAULT 'unverified',
  risk_score          numeric(4,3) CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 1)),
  risk_signals        jsonb NOT NULL DEFAULT '[]'::jsonb,
  canonical_id        uuid REFERENCES requests(id) ON DELETE SET NULL,
  embedding           vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  closed_at           timestamptz
);

COMMENT ON TABLE requests IS 'Core blood request entity. AI extraction + dedupe + risk live here.';
COMMENT ON COLUMN requests.canonical_id IS 'Points to master request after semantic dedupe.';
COMMENT ON COLUMN requests.embedding IS 'pgvector embedding for semantic duplicate detection.';

CREATE INDEX idx_requests_created_by ON requests (created_by);
CREATE INDEX idx_requests_status ON requests (status);
CREATE INDEX idx_requests_blood_group_status ON requests (blood_group, status)
  WHERE status IN ('open', 'partially_filled');
CREATE INDEX idx_requests_hospital ON requests (hospital_id);
CREATE INDEX idx_requests_needed_by ON requests (needed_by);
CREATE INDEX idx_requests_canonical ON requests (canonical_id);
CREATE INDEX idx_requests_created_at ON requests (created_at DESC);
CREATE INDEX idx_requests_embedding ON requests USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- 6. responses
-- ============================================================
CREATE TABLE responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  donor_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        response_status_enum NOT NULL DEFAULT 'notified',
  wave          integer NOT NULL DEFAULT 1 CHECK (wave > 0),
  eta_minutes   integer CHECK (eta_minutes IS NULL OR eta_minutes >= 0),
  notified_at   timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (request_id, donor_id)
);

COMMENT ON TABLE responses IS 'Every donor interaction with a request. Powers waves + fatigue.';

CREATE INDEX idx_responses_request ON responses (request_id);
CREATE INDEX idx_responses_donor ON responses (donor_id);
CREATE INDEX idx_responses_status ON responses (status);
CREATE INDEX idx_responses_wave ON responses (request_id, wave);
CREATE INDEX idx_responses_notified_at ON responses (notified_at);

-- ============================================================
-- 7. donations
-- ============================================================
CREATE TABLE donations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  donor_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  donated_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  units         integer NOT NULL DEFAULT 1 CHECK (units > 0),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE donations IS 'Confirmed fulfilment. Starts donor cooldown and awards reputation.';

CREATE INDEX idx_donations_donor ON donations (donor_id);
CREATE INDEX idx_donations_request ON donations (request_id);
CREATE INDEX idx_donations_donated_at ON donations (donated_at DESC);

-- ============================================================
-- 8. confirmations
-- ============================================================
CREATE TABLE confirmations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        confirmation_type_enum NOT NULL,
  geo         geography(Point, 4326),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE confirmations IS 'Peer/arrival evidence that replaces human admins.';

CREATE INDEX idx_confirmations_request ON confirmations (request_id);
CREATE INDEX idx_confirmations_user ON confirmations (user_id);
CREATE INDEX idx_confirmations_type ON confirmations (type);

-- ============================================================
-- 9. moderation_events
-- ============================================================
CREATE TABLE moderation_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  phone           text,
  request_id      uuid REFERENCES requests(id) ON DELETE SET NULL,
  input_hash      text,
  verdict         moderation_verdict_enum NOT NULL,
  confidence      numeric(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  reason          text NOT NULL,
  action          moderation_action_enum NOT NULL DEFAULT 'none',
  strikes_delta   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE moderation_events IS 'Full audit log for AI + rule-based moderation decisions.';

CREATE INDEX idx_moderation_user ON moderation_events (user_id);
CREATE INDEX idx_moderation_phone ON moderation_events (phone);
CREATE INDEX idx_moderation_request ON moderation_events (request_id);
CREATE INDEX idx_moderation_created_at ON moderation_events (created_at DESC);
CREATE INDEX idx_moderation_input_hash ON moderation_events (input_hash);

-- ============================================================
-- 10. Optional but recommended: notification_log
-- ============================================================
CREATE TABLE notification_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid REFERENCES requests(id) ON DELETE SET NULL,
  donor_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wave          integer NOT NULL,
  channel       text NOT NULL,          -- 'push' | 'email' | 'sms'
  template_key  text,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  opened_at     timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_notification_log_donor ON notification_log (donor_id, sent_at DESC);
CREATE INDEX idx_notification_log_request ON notification_log (request_id);

-- ============================================================
-- 11. Helper: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_hospitals_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 12. Useful views (optional but handy)
-- ============================================================
CREATE OR REPLACE VIEW open_requests AS
SELECT r.*,
       h.name AS hospital_name,
       h.geo  AS hospital_geo
FROM requests r
LEFT JOIN hospitals h ON h.id = r.hospital_id
WHERE r.status IN ('open', 'partially_filled')
  AND (r.needed_by IS NULL OR r.needed_by > now());

-- ============================================================
-- End of migration
-- ============================================================