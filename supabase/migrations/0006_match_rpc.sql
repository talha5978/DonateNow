-- Enable PostGIS if not already enabled
create extension if not exists postgis;

create or replace function public.get_matched_requests_for_user(
  target_user_id uuid
)
returns table (
  request_id uuid,
  created_by uuid,
  source text,
  raw_input text,
  structured jsonb,
  blood_group text,
  units_needed int,
  hospital_id uuid,
  hospital_name text,
  hospital_city text,
  needed_by timestamptz,
  urgency text,
  status text,
  verification_state text,
  created_at timestamptz,
  distance_km float,
  match_score float
)
language plpgsql
security definer
as $$
declare
  u_blood text;
  u_geo geometry;
  u_radius float;
  u_last_donated timestamptz;
  u_available boolean;
begin
  -- 1. Fetch user profile attributes
  select 
    blood_group, geo, radius_km, last_donated_at, available
  into 
    u_blood, u_geo, u_radius, u_last_donated, u_available
  from public.profiles
  where id = target_user_id;

  -- If user not found, profile incomplete, or currently unavailable, return empty
  if not found or u_available = false or u_blood is null or u_geo is null then
    return;
  end if;

  -- 2. Enforce 56-day eligibility rule (skip if last_donated_at is null)
  if u_last_donated is not null and (now() - u_last_donated) < interval '56 days' then
    return;
  end if;

  -- 3. Query active open requests matching spatial radius and compatibility
  return query
  select 
    r.id as request_id,
    r.created_by,
    r.source,
    r.raw_input,
    r.structured,
    r.blood_group,
    r.units_needed,
    r.hospital_id,
    h.name as hospital_name,
    h.city as hospital_city,
    r.needed_by,
    r.urgency,
    r.status,
    r.verification_state,
    r.created_at,
    -- Calculate distance in kilometers using PostGIS
    round((st_distance(h.geo::geography, u_geo::geography) / 1000.0)::numeric, 1)::float as distance_km,
    -- Compute smart matching score (Urgency weight + Exact match bonus + Distance proximity)
    (
      case r.urgency when 'critical' then 50 when 'urgent' then 30 else 10 end +
      case when r.blood_group = u_blood then 40 else 20 end +
      greatest(0, 30 - (st_distance(h.geo::geography, u_geo::geography) / 1000.0 / coalesce(u_radius, 20) * 30))
    )::float as match_score
  from public.requests r
  join public.hospitals h on r.hospital_id = h.id
  where 
    r.status = 'open'
    -- Exclude user's own requests
    and r.created_by != target_user_id
    -- Ensure hospital has coordinates and is within user's preferred radius (default 20km)
    and h.geo is not null
    and st_dwithin(h.geo::geography, u_geo::geography, (coalesce(u_radius, 20) * 1000))
    -- Deterministic blood compatibility rule check
    and (
      -- O- can give to everyone
      (u_blood = 'O-'::text) or
      -- O+ can give to O+, A+, B+, AB+
      (u_blood = 'O+'::text and r.blood_group in ('O+', 'A+', 'B+', 'AB+')) or
      -- A- can give to A-, A+, AB-, AB+
      (u_blood = 'A-'::text and r.blood_group in ('A-', 'A+', 'AB-', 'AB+')) or
      -- A+ can give to A+, AB+
      (u_blood = 'A+'::text and r.blood_group in ('A+', 'AB+')) or
      -- B- can give to B-, B+, AB-, AB+
      (u_blood = 'B-'::text and r.blood_group in ('B-', 'B+', 'AB-', 'AB+')) or
      -- B+ can give to B+, AB+
      (u_blood = 'B+'::text and r.blood_group in ('B+', 'AB+')) or
      -- AB- can give to AB-, AB+
      (u_blood = 'AB-'::text and r.blood_group in ('AB-', 'AB+')) or
      -- AB+ can only give to AB+
      (u_blood = 'AB+'::text and r.blood_group = 'AB+')
    )
  order by match_score desc, r.created_at desc;
end;
$$;