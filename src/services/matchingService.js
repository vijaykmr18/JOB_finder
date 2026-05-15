import Job from '../models/Job.js';
import JobMatch from '../models/JobMatch.js';
import User from '../models/User.js';
import { getBatchDate } from '../utils/dates.js';
import { clamp, uniqueStrings } from '../utils/text.js';
import { discoverJobsForUser } from './jobDiscoveryService.js';
import { scoreJobsWithOpenRouter } from './openrouterService.js';

function textIncludesAny(text, words) {
  const lower = String(text || '').toLowerCase();
  return words.some((word) => lower.includes(String(word).toLowerCase()));
}

function inferRequiredYears(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const explicit = text.match(/(\d+)\+?\s*(?:years|yrs)/);
  if (explicit) return Number(explicit[1]);
  if (/intern|trainee|entry|junior|fresher/.test(text)) return 0;
  if (/senior|sr\.|lead|principal|staff|architect/.test(text)) return 5;
  if (/manager|head of|director/.test(text)) return 7;
  return 2;
}

function scoreSalary(user, job) {
  const desiredMin = Number(user.profile?.salaryMin || 0);
  const desiredMax = Number(user.profile?.salaryMax || 0);
  const min = Number(job.salary?.min || 0);
  const max = Number(job.salary?.max || 0);

  if (!desiredMin || (!min && !max)) return 68;
  const jobTop = max || min;
  const jobBottom = min || max;

  if (jobTop >= desiredMin && (!desiredMax || jobBottom <= desiredMax * 1.25)) return 92;
  if (jobTop >= desiredMin * 0.85) return 74;
  return 48;
}

function scoreLocation(user, job) {
  const preference = user.profile?.remotePreference || 'any';
  const locations = user.profile?.locations || [];
  const locationText = `${job.location} ${job.remote ? 'remote' : ''}`.toLowerCase();

  if (preference === 'remote' && job.remote) return 96;
  if (preference === 'onsite' && !job.remote && textIncludesAny(locationText, locations)) return 92;
  if (preference === 'hybrid' && /hybrid/.test(locationText)) return 92;
  if (locations.length && textIncludesAny(locationText, locations)) return 88;
  if (job.remote || preference === 'any') return 78;
  return 52;
}

function scoreSkills(user, job) {
  const preferred = uniqueStrings([...(user.profile?.preferredSkills || []), ...(user.resume?.parsedSkills || [])]);
  const jobText = `${job.title} ${job.description} ${(job.skills || []).join(' ')}`.toLowerCase();
  const matched = preferred.filter((skill) => jobText.includes(skill.toLowerCase()));
  const missing = (job.skills || [])
    .filter((skill) => !preferred.some((candidateSkill) => candidateSkill.toLowerCase() === skill.toLowerCase()))
    .slice(0, 5);

  if (!preferred.length) return { score: 55, matched, missing };

  const score = clamp((matched.length / Math.min(preferred.length, 8)) * 100, 35, 100);
  return { score, matched, missing };
}

export function heuristicScoreJob(user, job) {
  const roleWords = String(user.profile?.targetRole || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const roleScore = roleWords.length && textIncludesAny(`${job.title} ${job.description}`, roleWords) ? 92 : 58;
  const skillResult = scoreSkills(user, job);
  const requiredYears = inferRequiredYears(job);
  const candidateYears = Number(user.profile?.experienceYears || 0);
  const experienceScore = candidateYears + 1 >= requiredYears ? 90 : candidateYears + 2 >= requiredYears ? 72 : 45;
  const locationScore = scoreLocation(user, job);
  const salaryScore = scoreSalary(user, job);
  const recencyScore = job.postedAt && Date.now() - new Date(job.postedAt).getTime() < 1000 * 60 * 60 * 24 * 14 ? 85 : 68;

  const matchScore = clamp(
    skillResult.score * 0.34 +
      roleScore * 0.22 +
      experienceScore * 0.18 +
      locationScore * 0.14 +
      salaryScore * 0.08 +
      recencyScore * 0.04
  );

  const hiringChance = clamp(matchScore * 0.78 + experienceScore * 0.12 + skillResult.score * 0.1 - (requiredYears > candidateYears + 2 ? 8 : 0));

  return {
    matchScore,
    hiringChance,
    explanation: `${skillResult.matched.length || 0} matching skills, ${experienceScore >= 72 ? 'experience is close' : 'experience may be a stretch'}, and location fit is ${locationScore >= 78 ? 'good' : 'limited'}.`,
    strengths: skillResult.matched.slice(0, 5),
    gaps: skillResult.missing
  };
}

async function upsertJobs(jobs) {
  const saved = [];

  for (const job of jobs) {
    const doc = await Job.findOneAndUpdate(
      { externalId: job.externalId },
      { $set: job },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    saved.push(doc);
  }

  return saved;
}

export async function generateDailyMatches(userId, { force = false } = {}) {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const batchDate = getBatchDate();
  const existingCount = await JobMatch.countDocuments({ userId, batchDate, active: true });

  if (!force && existingCount >= 25) {
    return JobMatch.find({ userId, batchDate, active: true }).sort({ rank: 1 }).limit(25).populate('jobId');
  }

  const discovered = await discoverJobsForUser(user);
  const savedJobs = await upsertJobs(discovered);
  const withHeuristic = savedJobs
    .map((job) => ({ job, heuristic: heuristicScoreJob(user, job) }))
    .sort((left, right) => right.heuristic.matchScore - left.heuristic.matchScore)
    .slice(0, 40);

  let aiScores = new Map();
  try {
    aiScores = await scoreJobsWithOpenRouter(
      user,
      withHeuristic.slice(0, 30).map(({ job }) => job)
    );
  } catch (error) {
    console.warn(`OpenRouter scoring skipped: ${error.message}`);
  }

  const ranked = withHeuristic
    .map(({ job, heuristic }) => {
      const ai = aiScores.get(job.externalId);
      return {
        job,
        score: {
          matchScore: clamp(ai?.matchScore ?? heuristic.matchScore),
          hiringChance: clamp(ai?.hiringChance ?? heuristic.hiringChance),
          explanation: ai?.explanation || heuristic.explanation,
          strengths: uniqueStrings([...(ai?.strengths || []), ...heuristic.strengths]).slice(0, 5),
          gaps: uniqueStrings([...(ai?.gaps || []), ...heuristic.gaps]).slice(0, 5)
        }
      };
    })
    .sort((left, right) => right.score.matchScore + right.score.hiringChance - (left.score.matchScore + left.score.hiringChance))
    .slice(0, 25);

  await JobMatch.updateMany({ userId, batchDate }, { $set: { active: false, rank: 999 } });

  for (const [index, item] of ranked.entries()) {
    await JobMatch.findOneAndUpdate(
      { userId, jobId: item.job._id, batchDate },
      {
        $set: {
          rank: index + 1,
          active: true,
          matchScore: item.score.matchScore,
          hiringChance: item.score.hiringChance,
          explanation: item.score.explanation,
          strengths: item.score.strengths,
          gaps: item.score.gaps
        },
        $setOnInsert: {
          status: 'new'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return JobMatch.find({ userId, batchDate, active: true }).sort({ rank: 1 }).limit(25).populate('jobId');
}

export function serializeMatch(match) {
  const job = match.jobId;
  return {
    id: match._id.toString(),
    rank: match.rank,
    batchDate: match.batchDate,
    status: match.status,
    matchScore: match.matchScore,
    hiringChance: match.hiringChance,
    explanation: match.explanation,
    strengths: match.strengths || [],
    gaps: match.gaps || [],
    appliedAt: match.appliedAt,
    job: job
      ? {
          id: job._id.toString(),
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          jobType: job.jobType,
          description: job.description,
          skills: job.skills || [],
          salary: job.salary || {},
          applyUrl: job.applyUrl,
          activeHiring: job.activeHiring,
          activeVerifiedAt: job.activeVerifiedAt,
          verificationMethod: job.verificationMethod,
          source: job.source,
          postedAt: job.postedAt
        }
      : null
  };
}
