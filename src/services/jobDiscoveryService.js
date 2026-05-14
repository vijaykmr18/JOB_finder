import axios from 'axios';
import { compactText, extractSkillsFromText, stripHtml, uniqueStrings } from '../utils/text.js';

const http = axios.create({
  timeout: 12000,
  headers: {
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'JobChanceHunter/1.0 (+http://localhost:5173)'
  }
});

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
  const haystack = `${job.title} ${job.company} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
  const roleWords = String(profile.targetRole || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const skills = (profile.preferredSkills || []).map((skill) => skill.toLowerCase());

  if (!roleWords.length && !skills.length) return true;

  const skillHit = skills.some((skill) => haystack.includes(skill));
  const roleHit = roleWords.some((word) => haystack.includes(word));
  return skillHit || roleHit;
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
    source: {
      name: job.sourceName || 'Web',
      url: job.sourceUrl || applyUrl
    },
    postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
    lastSeenAt: new Date(),
    raw: job.raw
  };
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

  return jobs;
}
