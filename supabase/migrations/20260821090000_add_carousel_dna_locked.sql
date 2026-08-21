-- Locking a saved template protects it from two things: being deleted, and being
-- overwritten when an edited copy is saved.
--
-- A template is the reusable asset the whole Transform flow exists to produce,
-- and the two destructive paths are both one click away in the Vault. Locking is
-- opt-in, so existing rows stay editable.
--
-- The app tolerates this column being absent: listCarouselDna retries without it
-- and treats everything as unlocked, so deploying the code ahead of this
-- migration degrades rather than breaks.

alter table public.carousel_dna
  add column if not exists locked boolean not null default false;

comment on column public.carousel_dna.locked is
  'When true, the row cannot be updated in place or deleted. Enforced in lib/content/carousel-dna.ts.';
