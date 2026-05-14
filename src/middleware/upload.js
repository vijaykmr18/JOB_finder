import multer from 'multer';

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf') {
      callback(Object.assign(new Error('Only PDF resumes are supported'), { status: 400 }));
      return;
    }

    callback(null, true);
  }
});
