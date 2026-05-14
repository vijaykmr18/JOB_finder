import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    targetRole: { type: String, trim: true, default: '' },
    preferredSkills: [{ type: String, trim: true }],
    locations: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    salaryMin: { type: Number, min: 0, default: 0 },
    salaryMax: { type: Number, min: 0, default: 0 },
    remotePreference: {
      type: String,
      enum: ['any', 'remote', 'hybrid', 'onsite'],
      default: 'any'
    },
    jobTypes: [{ type: String, trim: true }],
    phone: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    fileName: String,
    text: String,
    parsedSkills: [String],
    uploadedAt: Date
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    xp: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },
    dailyStreak: { type: Number, default: 0 },
    lastAppliedDate: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    profile: { type: profileSchema, default: () => ({}) },
    resume: { type: resumeSchema, default: () => ({}) },
    stats: { type: statsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.methods.toClient = function toClient() {
  const object = this.toObject({ versionKey: false });
  delete object.passwordHash;
  object.id = object._id.toString();
  object.resumeUploaded = Boolean(object.resume?.text);
  object.profileReady = Boolean(
    object.resumeUploaded &&
      object.profile?.targetRole &&
      object.profile?.preferredSkills?.length &&
      object.profile?.locations?.length &&
      Number.isFinite(Number(object.profile?.experienceYears)) &&
      Number(object.profile?.salaryMin) > 0
  );
  delete object._id;
  return object;
};

export default mongoose.model('User', userSchema);
