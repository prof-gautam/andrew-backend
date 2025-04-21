const mongoose = require('mongoose');

const userRecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recommendations: [
    {
      type: { type: String, enum: ['quiz', 'module', 'course'], required: true },
      message: { type: String, required: true },
      referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    }
  ],
  generatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserRecommendation', userRecommendationSchema);
