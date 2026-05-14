import mongoose from 'mongoose';

const jobMatchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    batchDate: { type: String, required: true },
    rank: { type: Number, required: true },
    active: { type: Boolean, default: true },
    matchScore: { type: Number, min: 0, max: 100, required: true },
    hiringChance: { type: Number, min: 0, max: 100, required: true },
    explanation: { type: String, default: '' },
    strengths: [String],
    gaps: [String],
    status: {
      type: String,
      enum: ['new', 'viewed', 'bookmarked', 'applied', 'skipped'],
      default: 'new'
    },
    appliedAt: Date,
    bookmarkedAt: Date
  },
  { timestamps: true }
);

jobMatchSchema.index({ userId: 1, batchDate: 1, rank: 1 });
jobMatchSchema.index({ userId: 1, jobId: 1, batchDate: 1 }, { unique: true });

export default mongoose.model('JobMatch', jobMatchSchema);
