"use client"

import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Link2,
  Calendar,
  Building
} from "lucide-react"
import type { Resume } from "@/types/resume"

interface ResumePreviewProps {
  resume: Resume
  className?: string
}

export function ResumePreview({ resume, className }: ResumePreviewProps) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Present"
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div 
      className={`max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-8 ${className || ''}`}
      style={{ minHeight: '11in', fontFamily: 'Georgia, serif' }}
    >
      {/* Contact Information */}
      <section className="text-center border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {resume.contact_info.full_name}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          {resume.contact_info.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{resume.contact_info.email}</span>
            </div>
          )}
          {resume.contact_info.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{resume.contact_info.phone}</span>
            </div>
          )}
          {resume.contact_info.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{resume.contact_info.address}</span>
            </div>
          )}
        </div>
        {resume.contact_info.links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {resume.contact_info.links.map((link, index) => (
              <div key={index} className="flex items-center gap-1 text-sm text-blue-600">
                <Link2 className="h-4 w-4" />
                <span>{link.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Professional Summary */}
      {resume.summary && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {resume.summary}
          </p>
        </section>
      )}

      {/* Work Experience */}
      {resume.work_experience.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
            Professional Experience
          </h2>
          <div className="space-y-6">
            {resume.work_experience.map((exp, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{exp.position}</h3>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building className="h-4 w-4" />
                      <span className="font-medium">{exp.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(exp.start_date)} - {exp.is_current ? "Present" : formatDate(exp.end_date)}
                    </span>
                  </div>
                </div>
                {exp.description && (
                  <p className="text-gray-700">{exp.description}</p>
                )}
                {exp.responsibilities.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    {exp.responsibilities.map((resp, respIndex) => (
                      <li key={respIndex}>{resp}</li>
                    ))}
                  </ul>
                )}
                {exp.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exp.skills.map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
            Education
          </h2>
          <div className="space-y-4">
            {resume.education.map((edu, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
                    {edu.field_of_study && (
                      <p className="text-gray-700">{edu.field_of_study}</p>
                    )}
                    <p className="text-gray-700 font-medium">{edu.institution}</p>
                  </div>
                  {edu.graduation_date && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(edu.graduation_date)}</span>
                    </div>
                  )}
                </div>
                {edu.gpa && (
                  <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                )}
                {edu.honors.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-900">Honors:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 ml-4">
                      {edu.honors.map((honor, honorIndex) => (
                        <li key={honorIndex}>{honor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {edu.relevant_courses.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-900">Relevant Coursework:</h4>
                    <p className="text-sm text-gray-700">{edu.relevant_courses.join(", ")}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, index) => (
              <Badge key={index} variant="outline" className="text-sm">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
            Certifications
          </h2>
          <div className="space-y-3">
            {resume.certifications.map((cert, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    <p className="text-gray-700">{cert.issuer}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {cert.date_obtained && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(cert.date_obtained)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {cert.credential_id && (
                  <p className="text-sm text-gray-600">ID: {cert.credential_id}</p>
                )}
                {cert.expiration_date && (
                  <p className="text-sm text-gray-600">
                    Expires: {formatDate(cert.expiration_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}