export interface Link {
  name: string
  url: string
}

export interface ContactInfo {
  full_name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  links: Link[]
}

export interface WorkExperience {
  company: string
  position: string
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  description?: string | null
  responsibilities: string[]
  skills: string[]
}

export interface Education {
  institution: string
  degree: string
  field_of_study?: string | null
  graduation_date?: string | null
  gpa?: number | null
  honors: string[]
  relevant_courses: string[]
  skills: string[]
}

export interface Certification {
  name: string
  issuer: string
  date_obtained?: string | null
  expiration_date?: string | null
  credential_id?: string | null
}

export interface Resume {
  contact_info: ContactInfo
  summary?: string | null
  work_experience: WorkExperience[]
  education: Education[]
  certifications: Certification[]
  skills: string[]
}