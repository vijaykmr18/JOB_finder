export const COMMON_SKILLS = [
  'javascript',
  'typescript',
  'react',
  'next.js',
  'node.js',
  'express',
  'mongodb',
  'sql',
  'postgresql',
  'mysql',
  'python',
  'django',
  'flask',
  'fastapi',
  'java',
  'spring',
  'c#',
  '.net',
  'php',
  'laravel',
  'html',
  'css',
  'tailwind',
  'aws',
  'azure',
  'gcp',
  'docker',
  'kubernetes',
  'linux',
  'git',
  'graphql',
  'rest api',
  'machine learning',
  'data analysis',
  'excel',
  'power bi',
  'tableau',
  'salesforce',
  'marketing',
  'seo',
  'ui/ux',
  'figma',
  'product management',
  'project management',
  'qa',
  'selenium',
  'cypress',
  'devops'
];

export function toArray(value) {
  if (Array.isArray(value)) {
    return value.map(cleanToken).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(cleanToken).filter(Boolean);
  }

  return [];
}

export function cleanToken(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function stripHtml(value = '') {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactText(value = '', maxLength = 1200) {
  const text = stripHtml(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

export function extractSkillsFromText(text = '') {
  const lower = ` ${String(text).toLowerCase()} `;
  return COMMON_SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(lower);
  });
}

export function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function uniqueStrings(values) {
  const seen = new Set();
  return values
    .map(cleanToken)
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function profileIsReady(user) {
  const profile = user?.profile || {};
  return Boolean(
    user?.resume?.text &&
      profile.targetRole &&
      profile.preferredSkills?.length &&
      profile.locations?.length &&
      Number.isFinite(Number(profile.experienceYears)) &&
      Number(profile.salaryMin) > 0
  );
}
