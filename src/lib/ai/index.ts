import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { Resume, ContactInfo, WorkExperience, Education, Certification } from '$lib/types/resume';
import type { UserResume } from '$lib/types/user-resume';
import type { UserJob } from '$lib/types/user-job';
import type { Job } from '$lib/types/job';

// Schema definitions for AI extraction
const ContactInfoSchema = z.object({
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  links: z.array(z.object({
    name: z.string(),
    url: z.string()
  }))
});

const WorkExperienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
  responsibilities: z.array(z.string()),
  skills: z.array(z.string())
});

const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().nullable(),
  graduationDate: z.string().nullable(),
  gpa: z.number().nullable(),
  honors: z.array(z.string()),
  relevantCourses: z.array(z.string()),
  skills: z.array(z.string())
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  dateObtained: z.string().nullable(),
  expirationDate: z.string().nullable(),
  credentialId: z.string().nullable()
});

const ResumeSchema = z.object({
  contactInfo: ContactInfoSchema,
  summary: z.string().nullable(),
  workExperience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),
  skills: z.array(z.string())
});

const JobSchema = z.object({
  company: z.string(),
  title: z.string(),
  description: z.string(),
  salary: z.string().nullable(),
  responsibilities: z.array(z.string()).nullable(),
  qualifications: z.array(z.string()).nullable(),
  logistics: z.array(z.string()).nullable(),
  location: z.array(z.string()).nullable(),
  additionalInfo: z.array(z.string()).nullable(),
  link: z.string().nullable()
});

// Resume extraction from file content
export async function extractResumeWithAI(
  content: string,
  fileType: string
): Promise<Partial<Resume>> {
  const isBase64 = fileType === 'application/pdf';
  
  const prompt = isBase64 
    ? 'Extract all information from this resume PDF. Return structured data with contact info, summary, work experience, education, certifications, and skills.'
    : 'Extract all information from this resume text. Return structured data with contact info, summary, work experience, education, certifications, and skills.';

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ResumeSchema,
      system: `You are a resume parser. Extract all relevant information from the provided resume.
        - Parse contact information including name, email, phone, address, and social links
        - Extract professional summary if present
        - Parse all work experiences with dates, responsibilities, and skills used
        - Extract education details including institutions, degrees, dates, and relevant courses
        - Identify certifications with issuing organizations and dates
        - Compile a comprehensive list of technical and soft skills
        - Preserve original formatting and details as much as possible`,
      prompt: isBase64 
        ? `${prompt}\n\n[PDF content in base64]:\n${content}`
        : `${prompt}\n\n${content}`
    });

    return result.object;
  } catch (error) {
    console.error('Error extracting resume with AI:', error);
    throw new Error('Failed to extract resume information');
  }
}

// Job extraction from URL content or text
export async function extractJobWithAI(content: string): Promise<Partial<Job>> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: JobSchema,
      system: `You are a job posting parser. Extract all relevant information from the provided job posting.
        - Identify the company name and job title
        - Extract the full job description
        - Parse salary information if mentioned
        - List all responsibilities/duties
        - Extract required and preferred qualifications
        - Identify logistics information (remote/hybrid/onsite, schedule, etc.)
        - Extract location information
        - Capture any additional relevant information
        - Preserve the job posting URL if present`,
      prompt: `Extract all information from this job posting:\n\n${content}`
    });

    return result.object;
  } catch (error) {
    console.error('Error extracting job with AI:', error);
    throw new Error('Failed to extract job information');
  }
}

// Fetch job content from URL
export async function fetchJobContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Simple HTML to text conversion
    // In production, use a proper HTML parser
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error fetching job content:', error);
    throw new Error('Failed to fetch job content from URL');
  }
}

// Generate optimized resume for a specific job
export async function generateOptimizedResume(
  resume: UserResume,
  job: UserJob
): Promise<{
  content: string;
  score: number;
  keywords: string[];
  suggestions: string[];
}> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        content: z.string(),
        score: z.number().min(0).max(100),
        keywords: z.array(z.string()),
        suggestions: z.array(z.string())
      }),
      system: `You are an ATS optimization expert. Create an optimized version of the resume for the specific job posting.
        - Tailor the professional summary to match the job requirements
        - Reorder and emphasize relevant work experiences
        - Highlight skills that match the job requirements
        - Include relevant keywords naturally throughout
        - Ensure ATS-friendly formatting (no tables, graphics, or special characters)
        - Calculate an ATS match score (0-100)
        - Identify matched keywords from the job posting
        - Provide suggestions for further improvements`,
      prompt: `Optimize this resume for the job posting:
        
        RESUME:
        ${JSON.stringify(resume, null, 2)}
        
        JOB POSTING:
        Company: ${job.company}
        Title: ${job.title}
        Description: ${job.description}
        Responsibilities: ${job.responsibilities?.join('\n')}
        Qualifications: ${job.qualifications?.join('\n')}
        
        Generate an optimized resume in markdown format with an ATS score, matched keywords, and improvement suggestions.`
    });

    return result.object;
  } catch (error) {
    console.error('Error generating optimized resume:', error);
    throw new Error('Failed to generate optimized resume');
  }
}

// Generate cover letter
export async function generateCoverLetterWithAI(
  resume: UserResume,
  job: UserJob,
  tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional'
): Promise<string> {
  const toneInstructions = {
    professional: 'Use a professional, formal tone appropriate for corporate environments',
    enthusiastic: 'Use an enthusiastic, energetic tone that shows passion and excitement',
    conversational: 'Use a conversational, friendly tone while maintaining professionalism'
  };

  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      system: `You are a professional cover letter writer. Create compelling cover letters that:
        - Open with a strong hook that captures attention
        - Demonstrate knowledge of the company and role
        - Connect relevant experiences to job requirements
        - Show genuine interest and cultural fit
        - Include specific examples and achievements
        - ${toneInstructions[tone]}
        - Close with a clear call to action`,
      prompt: `Write a cover letter for this job application:
        
        CANDIDATE BACKGROUND:
        Name: ${resume.contactInfo.fullName}
        Summary: ${resume.summary}
        Recent Experience: ${resume.workExperience[0]?.position} at ${resume.workExperience[0]?.company}
        Key Skills: ${resume.skills.slice(0, 10).join(', ')}
        
        JOB DETAILS:
        Company: ${job.company}
        Position: ${job.title}
        Description: ${job.description}
        Key Requirements: ${job.qualifications?.slice(0, 5).join(', ')}
        
        Write a compelling cover letter in markdown format.`
    });

    return result.text;
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw new Error('Failed to generate cover letter');
  }
}

// Generate company research
export async function generateCompanyResearchWithAI(
  company: string,
  role: string
): Promise<string> {
  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a company research analyst. Provide comprehensive research about companies including:
        - Company overview and history
        - Mission, vision, and values
        - Recent news and developments
        - Company culture and work environment
        - Growth trajectory and financial health
        - Key products or services
        - Leadership team
        - Interview tips specific to the company
        - Common interview questions
        - Salary ranges for the role`,
      prompt: `Research ${company} for someone applying to a ${role} position. 
        Provide comprehensive insights that would help in interviews and negotiations.
        Format the response in markdown with clear sections.`
    });

    return result.text;
  } catch (error) {
    console.error('Error generating company research:', error);
    throw new Error('Failed to generate company research');
  }
}

// Generate interview preparation materials
export async function generateInterviewPrepWithAI(
  resume: UserResume,
  job: UserJob
): Promise<string> {
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      system: `You are an interview coach. Create comprehensive interview preparation materials including:
        - Likely technical questions based on the role
        - Behavioral questions using STAR method examples
        - Questions to ask the interviewer
        - Key talking points about experiences
        - How to address potential concerns or gaps
        - Salary negotiation tips
        - Day-of interview checklist`,
      prompt: `Create interview preparation materials for:
        
        CANDIDATE:
        Background: ${resume.summary}
        Experience: ${resume.workExperience.map(w => `${w.position} at ${w.company}`).join(', ')}
        Skills: ${resume.skills.join(', ')}
        
        POSITION:
        ${job.title} at ${job.company}
        Requirements: ${job.qualifications?.join(', ')}
        Responsibilities: ${job.responsibilities?.join(', ')}
        
        Format as a comprehensive interview prep guide in markdown.`
    });

    return result.text;
  } catch (error) {
    console.error('Error generating interview prep:', error);
    throw new Error('Failed to generate interview preparation materials');
  }
}