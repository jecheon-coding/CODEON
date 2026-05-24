-- Add show_hint and show_solution columns to learning_chapters
ALTER TABLE learning_chapters
  ADD COLUMN IF NOT EXISTS show_hint     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_solution BOOLEAN NOT NULL DEFAULT true;
