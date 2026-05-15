import axios from 'axios';
import { compactText, extractSkillsFromText, stripHtml, uniqueStrings } from '../utils/text.js';

const http = axios.create({
  timeout: 12000,
  headers: {
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'JobChanceHunter/1.0 (+http://localhost:5173)'
  }
});

const GREENHOUSE_BOARDS = [
  { board: 'gitlab', company: 'GitLab' },
  { board: 'datadog', company: 'Datadog' },
  { board: 'stripe', company: 'Stripe' },
  { board: 'airbnb', company: 'Airbnb' },
  { board: 'figma', company: 'Figma' },
  { board: 'okta', company: 'Okta' },
  { board: 'reddit', company: 'Reddit' },
  { board: 'roblox', company: 'Roblox' },
  { board: 'cloudflare', company: 'Cloudflare' }
];

function hashValue(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildQueries(user) {
  const profile = user.profile || {};
  const skills = profile.preferredSkills || [];
  const role = profile.targetRole || skills.slice(0, 2).join(' ');
  const queries = [
    role,
    `${role} ${skills.slice(0, 2).join(' ')}`,
    skills[0],
    'software developer'
  ];

  return uniqueStrings(queries).slice(0, 3);
}

function matchesProfile(job, user) {
  const profile = user.profile || {};
  const title = String(job.title || '').toLowerCase();
  const haystack = `${job.title} ${job.company} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
  const roleWords = String(profile.targetRole || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const skills = (profile.preferredSkills || []).map((skill) => skill.toLowerCase());

  if (!roleWords.length && !skills.length) return true;

  const skillHit = skills.some((skill) => haystack.includes(skill));
  const rolePhrase = String(profile.targetRole || '').toLowerCase();
  const titleRoleHit = title.includes(rolePhrase) || roleWords.some((word) => title.includes(word));
  const bodyRoleHit = roleWords.length > 1 ? roleWords.every((word) => haystack.includes(word)) : roleWords.some((word) => haystack.includes(word));
  const roleHit = titleRoleHit || bodyRoleHit;
  return skillHit || roleHit;
}

function discoveryScore(job, user) {
  const profile = user.profile || {};
  const title = String(job.title || '').toLowerCase();
  const haystack = `${job.title} ${job.description} ${(job.skills || []).join(' ')}`.toLowerCase();
  const roleWords = String(profile.targetRole || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const skills = (profile.preferredSkills || []).map((skill) => String(skill).toLowerCase());
  const locations = (profile.locations || []).map((location) => String(location).toLowerCase());

  const roleScore = roleWords.reduce((score, word) => score + (title.includes(word) ? 18 : haystack.includes(word) ? 7 : 0), 0);
  const skillScore = skills.reduce((score, skill) => score + (haystack.includes(skill) ? 10 : 0), 0);
  const locationScore = locations.some((location) => `${job.location} ${job.remote ? 'remote' : ''}`.toLowerCase().includes(location)) ? 16 : 0;
  const remoteScore = profile.remotePreference === 'remote' && job.remote ? 14 : 0;
  const directScore = job.verificationMethod === 'company-careers-page' ? 18 : 0;
  const postedScore = job.postedAt && Date.now() - new Date(job.postedAt).getTime() < 1000 * 60 * 60 * 24 * 21 ? 8 : 0;

  return roleScore + skillScore + locationScore + remoteScore + directScore + postedScore;
}

function normalizeSalary(rawSalary) {
  const raw = String(rawSalary || '').trim();
  if (!raw) return {};

  const numbers = raw
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value));

  if (!numbers?.length) return { raw };

  const normalized = numbers.map((value) => (value < 1000 ? value * 1000 : value));
  return {
    min: Math.min(...normalized),
    max: Math.max(...normalized),
    raw,
    currency: raw.includes('₹') || raw.toLowerCase().includes('inr') ? 'INR' : 'USD'
  };
}

function normalizeJob(job) {
  const description = compactText(job.description || job.contents || job.descriptionText || '', 1800);
  const extractedSkills = extractSkillsFromText(`${job.title} ${description} ${(job.tags || []).join(' ')}`);
  const skills = uniqueStrings([...(job.skills || []), ...(job.tags || []), ...extractedSkills]);
  const applyUrl = job.applyUrl || job.url || job.sourceUrl;

  if (!job.title || !job.company || !applyUrl) return null;

  return {
    externalId: job.externalId || `${job.sourceName}:${hashValue(`${job.title}:${job.company}:${applyUrl}`)}`,
    title: stripHtml(job.title),
    company: stripHtml(job.company),
    location: stripHtml(job.location || 'Remote'),
    remote: Boolean(job.remote || /remote|anywhere|worldwide/i.test(job.location || '')),
    jobType: stripHtml(job.jobType || ''),
    description,
    skills,
    salary: normalizeSalary(job.salary),
    applyUrl,
    activeHiring: job.activeHiring ?? true,
    activeVerifiedAt: job.activeVerifiedAt || new Date(),
    verificationMethod: job.verificationMethod || 'live-job-feed',
    source: {
      name: job.sourceName || 'Web',
      url: job.sourceUrl || applyUrl
    },
    postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
    lastSeenAt: new Date(),
    raw: job.raw
  };
}

async function fetchGreenhouseBoard({ board, company }) {
  const { data } = await http.get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, {
    params: { content: true }
  });

  return (data.jobs || []).map((job) => {
    const location = job.location?.name || (job.offices || []).map((office) => office.name).filter(Boolean).join(', ') || 'Flexible';
    const tags = [
      ...(job.departments || []).map((department) => department.name),
      ...(job.offices || []).map((office) => office.name)
    ];

    return normalizeJob({
      externalId: `greenhouse:${board}:${job.id}`,
      title: job.title,
      company,
      location,
      description: job.content,
      tags,
      applyUrl: job.absolute_url,
      sourceName: `${company} Careers`,
      sourceUrl: `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
      postedAt: job.updated_at,
      remote: /remote/i.test(location),
      activeHiring: true,
      activeVerifiedAt: new Date(),
      verificationMethod: 'company-careers-page',
      raw: job
    });
  });
}

async function fetchCompanyCareerBoards() {
  const tasks = GREENHOUSE_BOARDS.map((board) => fetchGreenhouseBoard(board));

  const settled = await Promise.allSettled(tasks);
  const failures = settled
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message)
    .filter(Boolean);

  if (failures.length) {
    console.warn(`Some company career boards failed: ${failures.join(' | ')}`);
  }

  return settled.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value).filter(Boolean);
}

async function fetchRemotive(query) {
  const { data } = await http.get('https://remotive.com/api/remote-jobs', {
    params: { search: query, limit: 50 }
  });

  return (data.jobs || []).map((job) =>
    normalizeJob({
      externalId: `remotive:${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location,
      jobType: job.job_type,
      description: job.description,
      tags: job.tags || [],
      salary: job.salary,
      applyUrl: job.url,
      sourceName: 'Remotive',
      sourceUrl: job.url,
      postedAt: job.publication_date,
      remote: true,
      raw: job
    })
  );
}

async function fetchArbeitnow() {
  const { data } = await http.get('https://www.arbeitnow.com/api/job-board-api');

  return (data.data || []).map((job) =>
    normalizeJob({
      externalId: `arbeitnow:${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location,
      description: job.description,
      tags: job.tags || [],
      applyUrl: job.url,
      sourceName: 'Arbeitnow',
      sourceUrl: job.url,
      postedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
      remote: (job.tags || []).some((tag) => /remote/i.test(tag)),
      raw: job
    })
  );
}

async function fetchRemoteOk() {
  const { data } = await http.get('https://remoteok.com/api');

  return (Array.isArray(data) ? data.slice(1) : []).map((job) =>
    normalizeJob({
      externalId: `remoteok:${job.id}`,
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description,
      tags: job.tags || [],
      salary: job.salary_min || job.salary_max ? `${job.salary_min || ''}-${job.salary_max || ''}` : '',
      applyUrl: job.url,
      sourceName: 'RemoteOK',
      sourceUrl: job.url,
      postedAt: job.date,
      remote: true,
      raw: job
    })
  );
}

async function fetchJobicy(query) {
  const { data } = await http.get('https://jobicy.com/api/v2/remote-jobs', {
    params: { count: 50, tag: query }
  });

  return (data.jobs || []).map((job) =>
    normalizeJob({
      externalId: `jobicy:${job.id}`,
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo || 'Remote',
      description: job.jobDescription,
      tags: job.jobIndustry ? [job.jobIndustry] : [],
      salary: job.annualSalaryMin || job.annualSalaryMax ? `${job.annualSalaryMin || ''}-${job.annualSalaryMax || ''}` : '',
      applyUrl: job.url,
      sourceName: 'Jobicy',
      sourceUrl: job.url,
      postedAt: job.pubDate,
      remote: true,
      raw: job
    })
  );
}

async function fetchTheMuse(page = 1) {
  const { data } = await http.get('https://www.themuse.com/api/public/jobs', {
    params: { page, descending: true }
  });

  return (data.results || []).map((job) =>
    normalizeJob({
      externalId: `muse:${job.id}`,
      title: job.name,
      company: job.company?.name,
      location: (job.locations || []).map((location) => location.name).join(', ') || 'Flexible',
      description: job.contents,
      tags: [...(job.categories || []).map((category) => category.name), ...(job.levels || []).map((level) => level.name)],
      applyUrl: job.refs?.landing_page,
      sourceName: 'The Muse',
      sourceUrl: job.refs?.landing_page,
      postedAt: job.publication_date,
      remote: /remote/i.test((job.locations || []).map((location) => location.name).join(' ')),
      raw: job
    })
  );
}

export async function discoverJobsForUser(user) {
  const queries = buildQueries(user);
  const tasks = [
    fetchCompanyCareerBoards(),
    fetchArbeitnow(),
    fetchRemoteOk(),
    fetchTheMuse(1),
    ...queries.map((query) => fetchRemotive(query)),
    ...queries.slice(0, 2).map((query) => fetchJobicy(query))
  ];

  const settled = await Promise.allSettled(tasks);
  const failures = settled
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message)
    .filter(Boolean);

  if (failures.length) {
    console.warn(`Some job feeds failed: ${failures.join(' | ')}`);
  }

  const seen = new Set();
  const jobs = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)
    .filter(Boolean)
    .filter((job) => {
      const key = `${job.applyUrl}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return matchesProfile(job, user);
    });

  const scored = jobs
    .map((job) => ({ job, score: discoveryScore(job, user) }))
    .sort((left, right) => right.score - left.score);
  const directCareerJobs = scored.filter(({ job }) => job.verificationMethod === 'company-careers-page').slice(0, 60);
  const feedJobs = scored.filter(({ job }) => job.verificationMethod !== 'company-careers-page').slice(0, 60);

  return [...directCareerJobs, ...feedJobs]
    .sort((left, right) => right.score - left.score)
    .map(({ job }) => job)
    .slice(0, 100);
}
