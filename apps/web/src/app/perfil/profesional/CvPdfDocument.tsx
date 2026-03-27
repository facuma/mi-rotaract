'use client';

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { CvExperience, CvEducation, CvLanguage } from '@/lib/api';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#444',
    marginBottom: 2,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#222',
  },
  paragraph: {
    marginBottom: 4,
    textAlign: 'justify',
  },
  experienceItem: {
    marginBottom: 10,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  experienceRole: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  experienceDates: {
    fontSize: 9,
    color: '#555',
  },
  experienceCompany: {
    fontSize: 10,
    color: '#444',
    marginBottom: 2,
  },
  educationItem: {
    marginBottom: 8,
  },
  educationLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  languageLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillChip: {
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
  },
});

export type CvPdfDocumentProps = {
  fullName: string;
  email?: string;
  profession?: string | null;
  bio?: string | null;
  city?: string | null;
  linkedInUrl?: string | null;
  experiences: CvExperience[];
  education: CvEducation[];
  languages: CvLanguage[];
  skills: string[];
  /** Data URL of profile photo (e.g. from fetch + readAsDataURL) to avoid CORS */
  photoDataUrl?: string | null;
};

export function CvPdfDocument({
  fullName,
  email,
  profession,
  bio,
  city,
  linkedInUrl,
  experiences,
  education,
  languages,
  skills,
  photoDataUrl,
}: CvPdfDocumentProps) {
  const contactLines = [
    profession,
    city,
    email,
    linkedInUrl ? `LinkedIn: ${linkedInUrl}` : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{fullName}</Text>
            {contactLines.map((line, i) => (
              <Text key={i} style={styles.subtitle}>
                {line}
              </Text>
            ))}
          </View>
          {photoDataUrl && (
            <Image src={photoDataUrl} style={styles.photo} />
          )}
        </View>

        {bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <Text style={styles.paragraph}>{bio}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experiencia profesional</Text>
            {experiences.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceRole}>{exp.role}</Text>
                  <Text style={styles.experienceDates}>
                    {exp.startDate || ''}
                    {exp.endDate && exp.startDate ? ' – ' : ''}
                    {exp.current ? 'Actualidad' : exp.endDate || ''}
                  </Text>
                </View>
                <Text style={styles.experienceCompany}>{exp.company}</Text>
                {exp.description && (
                  <Text style={styles.paragraph}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formación académica</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.educationItem}>
                <View style={styles.educationLine}>
                  <Text style={styles.experienceRole}>
                    {edu.degree}
                    {edu.field ? ` – ${edu.field}` : ''}
                  </Text>
                  <Text style={styles.experienceDates}>
                    {edu.startDate || ''}
                    {edu.endDate && edu.startDate ? ' – ' : ''}
                    {edu.endDate || ''}
                  </Text>
                </View>
                <Text style={styles.experienceCompany}>{edu.institution}</Text>
              </View>
            ))}
          </View>
        )}

        {languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Idiomas</Text>
            {languages.map((lang, i) => (
              <View key={i} style={styles.languageLine}>
                <Text>{lang.language}</Text>
                <Text style={styles.experienceDates}>{lang.level}</Text>
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habilidades</Text>
            <View style={styles.skillsWrap}>
              {skills.map((s, i) => (
                <Text key={i} style={styles.skillChip}>
                  {s}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
