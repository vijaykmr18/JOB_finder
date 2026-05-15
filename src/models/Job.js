import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema(
  {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' },
    raw: String
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: 'Remote', trim: true },
    remote: { type: Boolean, default: false },
    jobType: { type: String, default: '' },
    description: { type: String, default: '' },
    skills: [{ type: String, trim: true }],
    salary: { type: salarySchema, default: () => ({}) },
    applyUrl: { type: String, required: true },
    activeHiring: { type: Boolean, default: true },
    activeVerifiedAt: { type: Date, default: Date.now },
    verificationMethod: { type: String, default: 'live-job-feed' },
    source: {
      name: String,
      url: String
    },
    postedAt: Date,
    lastSeenAt: { type: Date, default: Date.now },
    raw: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', company: 'text', description: 'text', skills: 'text' });
jobSchema.index({ lastSeenAt: -1 });
jobSchema.index({ 'source.name': 1 });

export default mongoose.model('Job', jobSchema);
