import { Router } from 'express';
import pdfParse from 'pdf-parse';
import { requireAuth } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';
import { extractSkillsFromText, toArray, uniqueStrings } from '../utils/text.js';

const router = Router();

function normalizeProfile(body) {
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
    phone: String(body.phone || '').trim()
  };
}

router.get('/', requireAuth, (req, res) => {
  res.json({ user: req.user.toClient() });
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    req.user.profile = normalizeProfile(req.body);
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
    const text = String(parsed.text || '').replace(/\s+/g, ' ').trim();

    if (text.length < 80) {
      return res.status(400).json({ message: 'Could not read enough text from this PDF. Try a text-based resume PDF.' });
    }

    const parsedSkills = extractSkillsFromText(text);

    req.user.resume = {
      fileName: req.file.originalname,
      text,
      parsedSkills,
      uploadedAt: new Date()
    };

    if (!req.user.profile.preferredSkills?.length && parsedSkills.length) {
      req.user.profile.preferredSkills = parsedSkills.slice(0, 12);
    }

    await req.user.save();

    res.json({
      message: 'Resume uploaded and parsed',
      parsedSkills,
      user: req.user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
