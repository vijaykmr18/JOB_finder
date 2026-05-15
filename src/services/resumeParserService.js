import { cleanToken, extractSkillsFromText, uniqueStrings } from '../utils/text.js';

const ROLE_PATTERNS = [
  'full stack developer',
  'full-stack developer',
  'frontend developer',
  'front end developer',
  'backend developer',
  'back end developer',
  'software engineer',
  'software developer',
  'web developer',
  'mern stack developer',
  'mean stack developer',
  'react developer',
  'node.js developer',
  'python developer',
  'java developer',
  'data analyst',
  'data scientist',
  'machine learning engineer',
  'devops engineer',
  'cloud engineer',
  'qa engineer',
  'test engineer',
  'ui ux designer',
  'product manager',
  'project manager',
  'business analyst'
];

const LOCATION_PATTERNS = [
  'remote',
  'hyderabad',
  'bengaluru',
  'bangalore',
  'chennai',
  'pune',
  'mumbai',
  'delhi',
  'noida',
  'gurugram',
  'gurgaon',
  'kolkata',
  'ahmedabad',
  'india',
  'united states',
  'usa',
  'canada',
  'united kingdom',
  'uk',
  'germany',
  'singapore',
  'dubai'
];

function titleCase(value) {
  return cleanToken(value).replace(/\w\S*/g, (word) => {
    if (/^(ui|ux|qa|usa|uk)$/i.test(word)) return word.toUpperCase();
    if (/^node\.js$/i.test(word)) return 'Node.js';
    return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
  });
}

function linesFromText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(cleanToken)
    .filter(Boolean);
}

function extractEmail(text) {
  return String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function extractPhone(text) {
  const match = String(text || '').match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? cleanToken(match[0]) : '';
}

function extractName(lines) {
  const candidate = lines
    .slice(0, 8)
    .find((line) => {
      if (line.length < 3 || line.length > 70) return false;
      if (/@|www\.|linkedin|github|resume|curriculum|phone|email/i.test(line)) return false;
      return /^[a-z .'-]+$/i.test(line) && line.split(/\s+/).length <= 5;
    });

  return candidate ? titleCase(candidate) : '';
}

function extractRole(text, lines) {
  const lower = String(text || '').toLowerCase();
  const matchedRole = ROLE_PATTERNS.find((role) => lower.includes(role));

  if (matchedRole) {
    return titleCase(matchedRole.replace('full-stack', 'full stack').replace('front end', 'frontend').replace('back end', 'backend'));
  }

  const headline = lines
    .slice(0, 12)
    .find((line) => /developer|engineer|analyst|designer|manager|consultant|architect/i.test(line) && line.length <= 90);

  return headline ? titleCase(headline) : '';
}

function extractExperienceYears(text) {
  const matches = [...String(text || '').matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience/gi)];
  const reverseMatches = [...String(text || '').matchAll(/experience\s*(?:of|:|-)?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi)];
  const values = [...matches, ...reverseMatches]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 60);

  return values.length ? Math.max(...values) : 0;
}

function extractLocations(text) {
  const lower = ` ${String(text || '').toLowerCase()} `;
  return uniqueStrings(
    LOCATION_PATTERNS.filter((location) => {
      const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(lower);
    }).map(titleCase)
  ).slice(0, 4);
}

function missingFieldsForProfile(profile) {
  const missing = [];

  if (!profile.targetRole) missing.push('target role');
  if (!profile.preferredSkills?.length) missing.push('skills');
  if (!profile.locations?.length) missing.push('location');
  if (!Number.isFinite(Number(profile.experienceYears))) missing.push('experience');
  if (!profile.salaryMin || Number(profile.salaryMin) <= 0) missing.push('salary expectation');

  return missing;
}

export function parseResumeText(text) {
  const lines = linesFromText(text);
  const parsedSkills = extractSkillsFromText(text);

  return {
    name: extractName(lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    targetRole: extractRole(text, lines),
    preferredSkills: parsedSkills,
    locations: extractLocations(text),
    experienceYears: extractExperienceYears(text)
  };
}

export function mergeResumeIntoProfile(currentProfile = {}, parsed = {}) {
  const profile = {
    targetRole: cleanToken(currentProfile.targetRole),
    preferredSkills: uniqueStrings(currentProfile.preferredSkills || []),
    locations: uniqueStrings(currentProfile.locations || []),
    experienceYears: Number(currentProfile.experienceYears || 0),
    salaryMin: Number(currentProfile.salaryMin || 0),
    salaryMax: Number(currentProfile.salaryMax || 0),
    remotePreference: currentProfile.remotePreference || 'any',
    jobTypes: uniqueStrings(currentProfile.jobTypes || []),
    phone: cleanToken(currentProfile.phone)
  };

  if (!profile.targetRole && parsed.targetRole) profile.targetRole = parsed.targetRole;
  if (!profile.preferredSkills.length && parsed.preferredSkills?.length) profile.preferredSkills = parsed.preferredSkills.slice(0, 14);
  if (!profile.locations.length && parsed.locations?.length) profile.locations = parsed.locations;
  if (!profile.experienceYears && parsed.experienceYears) profile.experienceYears = parsed.experienceYears;
  if (!profile.phone && parsed.phone) profile.phone = parsed.phone;

  if (parsed.locations?.some((location) => location.toLowerCase() === 'remote') && profile.remotePreference === 'any') {
    profile.remotePreference = 'remote';
  }

  return {
    profile,
    missingFields: missingFieldsForProfile(profile)
  };
}
