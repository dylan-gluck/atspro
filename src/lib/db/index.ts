import { Pool } from 'pg';
import type { 
  ContactInfo, 
  WorkExperience, 
  Education, 
  Certification 
} from '$lib/types/resume';
import type { UserResume } from '$lib/types/user-resume';
import type { 
  UserJob, 
  JobDocument, 
  JobActivity, 
  JobActivityType,
  JobStatus 
} from '$lib/types/user-job';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = {
  // User Resume Functions
  async getUserResume(userId: string): Promise<UserResume | null> {
    const result = await pool.query(
      `SELECT * FROM "userResume" WHERE "userId" = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      contactInfo: row.contactInfo as ContactInfo,
      summary: row.summary,
      workExperience: row.workExperience as WorkExperience[],
      education: row.education as Education[],
      certifications: row.certifications as Certification[],
      skills: row.skills,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  async createUserResume(userId: string, resumeData: Partial<Omit<UserResume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserResume> {
    const result = await pool.query(
      `INSERT INTO "userResume" 
       ("userId", "contactInfo", "summary", "workExperience", "education", "certifications", "skills")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        JSON.stringify(resumeData.contactInfo || {}),
        resumeData.summary || null,
        JSON.stringify(resumeData.workExperience || []),
        JSON.stringify(resumeData.education || []),
        JSON.stringify(resumeData.certifications || []),
        resumeData.skills || []
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      contactInfo: row.contactInfo as ContactInfo,
      summary: row.summary,
      workExperience: row.workExperience as WorkExperience[],
      education: row.education as Education[],
      certifications: row.certifications as Certification[],
      skills: row.skills,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  async updateUserResume(userId: string, updates: Partial<Omit<UserResume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserResume> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.contactInfo !== undefined) {
      fields.push(`"contactInfo" = $${paramCount++}`);
      values.push(JSON.stringify(updates.contactInfo));
    }
    if (updates.summary !== undefined) {
      fields.push(`"summary" = $${paramCount++}`);
      values.push(updates.summary);
    }
    if (updates.workExperience !== undefined) {
      fields.push(`"workExperience" = $${paramCount++}`);
      values.push(JSON.stringify(updates.workExperience));
    }
    if (updates.education !== undefined) {
      fields.push(`"education" = $${paramCount++}`);
      values.push(JSON.stringify(updates.education));
    }
    if (updates.certifications !== undefined) {
      fields.push(`"certifications" = $${paramCount++}`);
      values.push(JSON.stringify(updates.certifications));
    }
    if (updates.skills !== undefined) {
      fields.push(`"skills" = $${paramCount++}`);
      values.push(updates.skills);
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE "userResume" 
       SET ${fields.join(', ')}
       WHERE "userId" = $${paramCount}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      contactInfo: row.contactInfo as ContactInfo,
      summary: row.summary,
      workExperience: row.workExperience as WorkExperience[],
      education: row.education as Education[],
      certifications: row.certifications as Certification[],
      skills: row.skills,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  // Job Functions
  async getUserJobs(
    userId: string, 
    options: {
      status?: JobStatus;
      limit?: number;
      offset?: number;
      sort?: 'createdAt' | 'company' | 'title';
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<UserJob[]> {
    const { status, limit = 20, offset = 0, sort = 'createdAt', order = 'desc' } = options;
    
    let query = `SELECT * FROM "userJobs" WHERE "userId" = $1`;
    const params: any[] = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND "status" = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY "${sort}" ${order.toUpperCase()}`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      company: row.company,
      title: row.title,
      description: row.description,
      salary: row.salary,
      responsibilities: row.responsibilities,
      qualifications: row.qualifications,
      logistics: row.logistics,
      location: row.location,
      additionalInfo: row.additionalInfo,
      link: row.link,
      status: row.status,
      notes: row.notes,
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  },

  async getUserJobsCount(userId: string, options: { status?: JobStatus } = {}): Promise<number> {
    let query = `SELECT COUNT(*) FROM "userJobs" WHERE "userId" = $1`;
    const params: any[] = [userId];

    if (options.status) {
      query += ` AND "status" = $2`;
      params.push(options.status);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  },

  async getJob(jobId: string): Promise<UserJob | null> {
    const result = await pool.query(
      `SELECT * FROM "userJobs" WHERE "id" = $1`,
      [jobId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      company: row.company,
      title: row.title,
      description: row.description,
      salary: row.salary,
      responsibilities: row.responsibilities,
      qualifications: row.qualifications,
      logistics: row.logistics,
      location: row.location,
      additionalInfo: row.additionalInfo,
      link: row.link,
      status: row.status,
      notes: row.notes,
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  async createUserJob(userId: string, jobData: Partial<Omit<UserJob, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserJob> {
    const result = await pool.query(
      `INSERT INTO "userJobs" 
       ("userId", "company", "title", "description", "salary", "responsibilities", 
        "qualifications", "logistics", "location", "additionalInfo", "link", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        userId,
        jobData.company || '',
        jobData.title || '',
        jobData.description || '',
        jobData.salary || null,
        jobData.responsibilities || null,
        jobData.qualifications || null,
        jobData.logistics || null,
        jobData.location || null,
        jobData.additionalInfo || null,
        jobData.link || null,
        jobData.status || 'tracked',
        jobData.notes || null
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      company: row.company,
      title: row.title,
      description: row.description,
      salary: row.salary,
      responsibilities: row.responsibilities,
      qualifications: row.qualifications,
      logistics: row.logistics,
      location: row.location,
      additionalInfo: row.additionalInfo,
      link: row.link,
      status: row.status,
      notes: row.notes,
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  async updateJobStatus(jobId: string, status: JobStatus, appliedAt?: string | Date): Promise<void> {
    const fields = [`"status" = $2`];
    const values: any[] = [jobId, status];
    
    if (appliedAt) {
      fields.push(`"appliedAt" = $3`);
      values.push(appliedAt instanceof Date ? appliedAt.toISOString() : appliedAt);
    }

    await pool.query(
      `UPDATE "userJobs" SET ${fields.join(', ')} WHERE "id" = $1`,
      values
    );
  },

  async updateJobNotes(jobId: string, notes: string): Promise<void> {
    await pool.query(
      `UPDATE "userJobs" SET "notes" = $2 WHERE "id" = $1`,
      [jobId, notes]
    );
  },

  async deleteJob(jobId: string): Promise<void> {
    await pool.query(`DELETE FROM "userJobs" WHERE "id" = $1`, [jobId]);
  },

  // Document Functions
  async getJobDocuments(jobId: string): Promise<JobDocument[]> {
    const result = await pool.query(
      `SELECT * FROM "jobDocuments" WHERE "jobId" = $1 ORDER BY "createdAt" DESC`,
      [jobId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      type: row.type as JobDocument['type'],
      content: row.content,
      version: row.version,
      isActive: row.isActive,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  },

  async getDocument(documentId: string): Promise<JobDocument | null> {
    const result = await pool.query(
      `SELECT * FROM "jobDocuments" WHERE "id" = $1`,
      [documentId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      jobId: row.jobId,
      type: row.type as JobDocument['type'],
      content: row.content,
      version: row.version,
      isActive: row.isActive,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  async createJobDocument(
    jobId: string, 
    type: JobDocument['type'], 
    content: string,
    metadata?: any
  ): Promise<JobDocument> {
    // Get the next version number
    const versionResult = await pool.query(
      `SELECT COALESCE(MAX("version"), 0) + 1 as next_version 
       FROM "jobDocuments" WHERE "jobId" = $1 AND "type" = $2`,
      [jobId, type]
    );
    const version = versionResult.rows[0].next_version;

    // Deactivate previous versions
    await pool.query(
      `UPDATE "jobDocuments" SET "isActive" = false 
       WHERE "jobId" = $1 AND "type" = $2`,
      [jobId, type]
    );

    // Create new document
    const result = await pool.query(
      `INSERT INTO "jobDocuments" 
       ("jobId", "type", "content", "version", "isActive", "metadata")
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [jobId, type, content, version, metadata ? JSON.stringify(metadata) : null]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      jobId: row.jobId,
      type: row.type as JobDocument['type'],
      content: row.content,
      version: row.version,
      isActive: row.isActive,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  // Activity Functions
  async getJobActivities(
    jobId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<JobActivity[]> {
    const { limit = 50, offset = 0 } = options;
    
    const result = await pool.query(
      `SELECT * FROM "jobActivity" 
       WHERE "jobId" = $1 
       ORDER BY "createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [jobId, limit, offset]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      type: row.type,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.createdAt
    }));
  },

  async getJobActivityCount(jobId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM "jobActivity" WHERE "jobId" = $1`,
      [jobId]
    );
    return parseInt(result.rows[0].count);
  },

  async createActivity(
    jobId: string,
    type: JobActivityType,
    metadata?: any,
    description?: string
  ): Promise<JobActivity> {
    const desc = description || generateActivityDescription(type, metadata);
    
    const result = await pool.query(
      `INSERT INTO "jobActivity" ("jobId", "type", "description", "metadata")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobId, type, desc, metadata ? JSON.stringify(metadata) : null]
    );
    
    return {
      id: result.rows[0].id,
      jobId: result.rows[0].jobId,
      type: result.rows[0].type,
      description: result.rows[0].description,
      metadata: result.rows[0].metadata,
      createdAt: result.rows[0].createdAt
    };
  }
};

// Helper function to generate activity descriptions
function generateActivityDescription(type: JobActivityType, metadata?: any): string {
  switch (type) {
    case 'status_change':
      return `Status changed from ${metadata?.previousStatus || 'unknown'} to ${metadata?.newStatus || 'unknown'}`;
    case 'document_generated':
      return `Generated ${metadata?.type || 'document'}`;
    case 'note_added':
      return 'Added notes';
    case 'applied':
      return 'Applied to position';
    case 'interview_scheduled':
      return `Interview scheduled for ${metadata?.date || 'TBD'}`;
    case 'offer_received':
      return 'Received offer';
    default:
      return `Activity: ${type}`;
  }
}

export default db;