import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function extractJson(content) {
  const text = String(content || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('OpenRouter response did not contain JSON');
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function summarizeJob(job) {
  return {
    externalId: job.externalId,
    title: job.title,
    company: job.company,
    location: job.location,
    remote: job.remote,
    salary: job.salary?.raw || '',
    skills: job.skills?.slice(0, 12) || [],
    description: String(job.description || '').slice(0, 900)
  };
}

export async function scoreJobsWithOpenRouter(user, jobs) {
  if (!process.env.OPENROUTER_API_KEY || !jobs.length) {
    return new Map();
  }

  const profile = {
    targetRole: user.profile?.targetRole,
    preferredSkills: user.profile?.preferredSkills,
    locations: user.profile?.locations,
    experienceYears: user.profile?.experienceYears,
    salaryMin: user.profile?.salaryMin,
    salaryMax: user.profile?.salaryMax,
    remotePreference: user.profile?.remotePreference,
    resumeSkills: user.resume?.parsedSkills,
    resumeSummary: String(user.resume?.text || '').slice(0, 1800)
  };

  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-5.2',
      temperature: 0.2,
      max_tokens: 3500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an expert job-search ranking engine. Score real job postings for one candidate. Return only valid JSON.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            instruction:
              'Rank each job for this candidate. matchScore means fit. hiringChance means likely chance of getting an interview if they apply well. Be realistic and do not inflate scores. Return { "rankings": [{ "externalId": string, "matchScore": 0-100, "hiringChance": 0-100, "explanation": string, "strengths": string[], "gaps": string[] }] }.',
            candidate: profile,
            jobs: jobs.map(summarizeJob)
          })
        }
      ]
    },
    {
      timeout: 45000,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-OpenRouter-Title': 'Job Chance Hunter'
      }
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);
  const map = new Map();

  for (const item of parsed.rankings || []) {
    if (item.externalId) {
      map.set(item.externalId, item);
    }
  }

  return map;
}
