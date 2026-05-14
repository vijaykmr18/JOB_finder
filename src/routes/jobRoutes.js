import { Router } from 'express';
import JobMatch from '../models/JobMatch.js';
import { requireAuth } from '../middleware/auth.js';
import { getBatchDate } from '../utils/dates.js';
import { profileIsReady } from '../utils/text.js';
import { generateDailyMatches, serializeMatch } from '../services/matchingService.js';

const router = Router();

router.get('/today', requireAuth, async (req, res, next) => {
  try {
    const force = req.query.refresh === '1';
    const batchDate = getBatchDate();
    let matches = await JobMatch.find({ userId: req.user._id, batchDate, active: true })
      .sort({ rank: 1 })
      .limit(25)
      .populate('jobId');

    if (force || matches.length < 25) {
      matches = await generateDailyMatches(req.user._id, { force });
    }

    res.json({
      batchDate,
      matches: matches.map(serializeMatch),
      profileReady: profileIsReady(req.user),
      user: req.user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', requireAuth, async (req, res, next) => {
  try {
    const matches = await generateDailyMatches(req.user._id, { force: true });
    res.json({
      batchDate: getBatchDate(),
      matches: matches.map(serializeMatch),
      profileReady: profileIsReady(req.user),
      user: req.user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:matchId/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['viewed', 'bookmarked', 'skipped', 'new'].includes(status)) {
      return res.status(400).json({ message: 'Unsupported status' });
    }

    const update = { status };
    if (status === 'bookmarked') {
      update.bookmarkedAt = new Date();
      req.user.stats.bookmarks += 1;
      req.user.stats.xp += 5;
      await req.user.save();
    }

    const match = await JobMatch.findOneAndUpdate(
      { _id: req.params.matchId, userId: req.user._id },
      { $set: update },
      { new: true }
    ).populate('jobId');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json({ match: serializeMatch(match), user: req.user.toClient() });
  } catch (error) {
    next(error);
  }
});

router.post('/:matchId/apply', requireAuth, async (req, res, next) => {
  try {
    if (!profileIsReady(req.user)) {
      return res.status(400).json({ message: 'Upload a resume and complete profile details before applying' });
    }

    const match = await JobMatch.findOne({ _id: req.params.matchId, userId: req.user._id }).populate('jobId');
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const wasAlreadyApplied = match.status === 'applied';
    match.status = 'applied';
    match.appliedAt = new Date();
    await match.save();

    if (!wasAlreadyApplied) {
      req.user.stats.applications += 1;
      req.user.stats.xp += 25;
      req.user.stats.lastAppliedDate = getBatchDate();
      await req.user.save();
    }

    res.json({
      applyUrl: match.jobId.applyUrl,
      match: serializeMatch(match),
      user: req.user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
