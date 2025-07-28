-- Migration: Add survey_responses table
-- This migration adds support for storing survey responses

CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  surveyId TEXT NOT NULL,
  respondentName TEXT NOT NULL,
  responses TEXT NOT NULL, -- JSON string containing all responses
  submittedAt TEXT NOT NULL,
  FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE
);

-- Create index for faster queries by surveyId
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(surveyId);

-- Create index for sorting by submission date
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON survey_responses(submittedAt); 