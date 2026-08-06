-- Add show_explanation column to learning_chapters (```python-explanation fence toggle)
ALTER TABLE learning_chapters
  ADD COLUMN IF NOT EXISTS show_explanation BOOLEAN NOT NULL DEFAULT true;
