-- Drop and recreate the function with explicit type casting on every return column
drop function if exists public.get_matched_requests_for_user(uuid);

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
  units_needed integer,
  hospital_id uuid,
  hospital_name text,
  hospital_city text,
  needed_by timestamptz,
  urgency text,
  status text,
  verification_state text,
  created_at timestamptz,
  distance_km double precision,
  match_score double precision
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
    p.blood_group::text, p.geo, p.radius_km, p.last_donated_at, p.available
  into 
    u_blood, u_geo, u_radius, u_last_donated, u_available
  from public.profiles p
  where p.id = target_user_id;

  -- If user not found, profile incomplete, or currently unavailable, return empty
  if not found or u_available = false or u_blood is null or u_geo is null then
    return;
  end if;

  -- 2. Enforce 56-day eligibility rule
  if u_last_donated is not null and (now() - u_last_donated) < interval '56 days' then
    return;
  end if;

  -- 3. Query active open requests with explicit type casts
  return query
  select 
    r.id::uuid as request_id,
    r.created_by::uuid as created_by,
    r.source::text as source,
    r.raw_input::text as raw_input,
    r.structured::jsonb as structured,
    r.blood_group::text as blood_group,
    r.units_needed::integer as units_needed,
    r.hospital_id::uuid as hospital_id,
    h.name::text as hospital_name,
    h.city::text as hospital_city,
    r.needed_by::timestamptz as needed_by,
    r.urgency::text as urgency,
    r.status::text as status,
    r.verification_state::text as verification_state,
    r.created_at::timestamptz as created_at,
    -- Calculate distance in kilometers
    round((st_distance(h.geo::geography, u_geo::geography) / 1000.0)::numeric, 1)::double precision as distance_km,
    -- Compute smart matching score
    (
      case r.urgency::text when 'critical' then 50 when 'urgent' then 30 else 10 end +
      case when r.blood_group::text = u_blood then 40 else 20 end +
      greatest(0, 30 - (st_distance(h.geo::geography, u_geo::geography) / 1000.0 / coalesce(u_radius, 20)::float * 30))
    )::double precision as match_score
  from public.requests r
  join public.hospitals h on r.hospital_id = h.id
  where 
    r.status::text = 'open'
    -- Exclude user's own requests
    and r.created_by != target_user_id
    -- Ensure hospital has coordinates and is within user's preferred radius
    and h.geo is not null
    and st_dwithin(h.geo::geography, u_geo::geography, (coalesce(u_radius, 20)::float * 1000))
    -- Deterministic blood compatibility rule check with explicit text casts
    and (
      (u_blood = 'O-') or
      (u_blood = 'O+' and r.blood_group::text in ('O+', 'A+', 'B+', 'AB+')) or
      (u_blood = 'A-' and r.blood_group::text in ('A-', 'A+', 'AB-', 'AB+')) or
      (u_blood = 'A+' and r.blood_group::text in ('A+', 'AB+')) or
      (u_blood = 'B-' and r.blood_group::text in ('B-', 'B+', 'AB-', 'AB+')) or
      (u_blood = 'B+' and r.blood_group::text in ('B+', 'AB+')) or
      (u_blood = 'AB-' and r.blood_group::text in ('AB-', 'AB+')) or
      (u_blood = 'AB+' and r.blood_group::text = 'AB+')
    )
  order by match_score desc, r.created_at desc;
end;
$$;