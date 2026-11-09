CREATE OR REPLACE FUNCTION find_hospital_by_name(search_term text)
RETURNS TABLE (id uuid, name text, score real)
LANGUAGE sql
AS $$
  SELECT
    h.id,
    h.name,
    GREATEST(
      similarity(h.name, search_term),
      (SELECT MAX(similarity(alias, search_term)) FROM unnest(h.aliases) alias)
    ) AS score
  FROM hospitals h
  WHERE
    h.name % search_term
    OR EXISTS (
      SELECT 1 FROM unnest(h.aliases) alias WHERE alias % search_term
    )
  ORDER BY score DESC
  LIMIT 5;
$$;