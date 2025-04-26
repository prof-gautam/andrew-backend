const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  keyPoints: [{ type: String }],
  order: { type: Number, required: true },
  materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
  quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  timeline: { type: Number, required: true },
  moduleStatus: {
    type: String,
    enum: ['new', 'on-track', 'late', 'completed'],
    default: 'new'
  },
    courseGrade: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      }
});

// ➡️ Add virtual
moduleSchema.virtual('timeLeft').get(function () {
  const createdAt = this.createdAt;
  const timelineInDays = this.timeline;

  if (!createdAt || !timelineInDays) return null;

  const deadline = new Date(createdAt.getTime() + timelineInDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const timeLeftInMs = deadline - now;
  const timeLeftInDays = Math.ceil(timeLeftInMs / (1000 * 60 * 60 * 24));

  return timeLeftInDays > 0 ? timeLeftInDays : 0;
});

// ➡️ Auto-update status if overdue
moduleSchema.pre('save', function (next) {
    if (this.moduleStatus === 'completed') return next();
  
    const deadline = new Date(this.createdAt.getTime() + this.timeline * 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeLeftInMs = deadline - now;
    const timeLeftInDays = Math.ceil(timeLeftInMs / (1000 * 60 * 60 * 24));
  
    if (timeLeftInDays <= 0) {
      this.moduleStatus = 'late';
    }
  
    next();
  });  
// ➡️ Make virtuals visible in JSON
moduleSchema.set('toJSON', { virtuals: true });
moduleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Module', moduleSchema);
