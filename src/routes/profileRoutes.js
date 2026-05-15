import { Router } from 'express';
import pdfParse from 'pdf-parse';
import { requireAuth } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';
import { mergeResumeIntoProfile, parseResumeText } from '../services/resumeParserService.js';
import { toArray, uniqueStrings } from '../utils/text.js';

const router = Router();

function normalizeProfile(body, currentProfile = {}) {
  const salaryMin = Number(body.salaryMin || 0);
  const salaryMax = Number(body.salaryMax || 0);
  const experienceYears = Number(body.experienceYears || 0);

  return {
    targetRole: String(body.targetRole || '').trim(),
    preferredSkills: uniqueStrings(toArray(body.preferredSkills)),
    locations: uniqueStrings(toArray(body.locations)),
    experienceYears: Number.isFinite(experienceYears) ? Math.max(0, experienceYears) : 0,
    salaryMin: Number.isFinite(salaryMin) ? Math.max(0, salaryMin) : 0,
    salaryMax: Number.isFinite(salaryMax) ? Math.max(0, salaryMax) : 0,
    remotePreference: ['any', 'remote', 'hybrid', 'onsite'].includes(body.remotePreference) ? body.remotePreference : 'any',
    jobTypes: uniqueStrings(toArray(body.jobTypes)),
    phone: String(body.phone ?? currentProfile.phone ?? '').trim()
  };
}

router.get('/', requireAuth, (req, res) => {
  res.json({ user: req.user.toClient() });
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    req.user.profile = normalizeProfile(req.body, req.user.profile);
    await req.user.save();
    res.json({ user: req.user.toClient() });
  } catch (error) {
    next(error);
  }
});

router.post('/resume', requireAuth, resumeUpload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF is required' });
    }

    const parsed = await pdfParse(req.file.buffer);
    const rawText = String(parsed.text || '').trim();
    const text = rawText.replace(/\s+/g, ' ').trim();

    if (text.length < 80) {
      return res.status(400).json({ message: 'Could not read enough text from this PDF. Try a text-based resume PDF.' });
    }

    const parsedProfile = parseResumeText(rawText);
    const { profile, missingFields } = mergeResumeIntoProfile(req.user.profile, parsedProfile);

    req.user.resume = {
      fileName: req.file.originalname,
      text,
      parsedSkills: parsedProfile.preferredSkills,
      parsedProfile,
      uploadedAt: new Date()
    };
    req.user.profile = profile;

    await req.user.save();

    res.json({
      message: 'Resume uploaded and parsed',
      parsedSkills: parsedProfile.preferredSkills,
      parsedProfile,
      missingFields,
      user: req.user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
