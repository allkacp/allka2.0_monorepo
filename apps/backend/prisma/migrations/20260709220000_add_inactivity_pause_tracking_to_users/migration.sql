-- Additive only: tracks "accessed after inactivity pause" so the admin UI
-- can show a sticky "Pausado" status instead of silently auto-reactivating
-- the moment the user logs in again.
ALTER TABLE `users`
  ADD COLUMN `inactivity_paused_accessed_at` DATETIME(3) NULL,
  ADD COLUMN `inactivity_paused_access_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `reactivation_review_required` BOOLEAN NOT NULL DEFAULT false;
