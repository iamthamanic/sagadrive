-- Character profile traits become composable blocks.
-- Existing non-empty scalar values are preserved as a single array element.

ALTER TABLE characters
  ALTER COLUMN personality_traits SET DEFAULT '{}';

ALTER TABLE characters
  ALTER COLUMN ideals TYPE TEXT[]
  USING CASE
    WHEN ideals IS NULL OR btrim(ideals) = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[ideals]
  END,
  ALTER COLUMN ideals SET DEFAULT '{}';

ALTER TABLE characters
  ALTER COLUMN bonds TYPE TEXT[]
  USING CASE
    WHEN bonds IS NULL OR btrim(bonds) = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[bonds]
  END,
  ALTER COLUMN bonds SET DEFAULT '{}';

ALTER TABLE characters
  ALTER COLUMN flaws TYPE TEXT[]
  USING CASE
    WHEN flaws IS NULL OR btrim(flaws) = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[flaws]
  END,
  ALTER COLUMN flaws SET DEFAULT '{}';
