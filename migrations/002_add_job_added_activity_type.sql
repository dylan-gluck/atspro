-- Add 'job_added' to the allowed activity types
ALTER TABLE "jobActivity" DROP CONSTRAINT "jobActivity_type_check";

ALTER TABLE "jobActivity" ADD CONSTRAINT "jobActivity_type_check" 
CHECK ("type" IN ('job_added', 'status_change', 'document_generated', 'note_added', 'applied', 'interview_scheduled', 'offer_received', 'job_updated'));