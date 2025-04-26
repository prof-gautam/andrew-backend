const Quiz = require("../models/quizModel");
const Module = require("../models/moduleModel");

exports.recalculateModuleGrade = async (moduleId) => {
  try {
    const quizzes = await Quiz.find({ moduleId });

    let totalPercentage = 0;
    let completedQuizzes = 0;

    for (const quiz of quizzes) {
      const latestCompletedAttempt = quiz.attempts
        .filter((a) => a.isCompleted)
        .sort((a, b) => b.attemptNumber - a.attemptNumber)[0];

      if (latestCompletedAttempt && latestCompletedAttempt.percentage) {
        totalPercentage += parseFloat(latestCompletedAttempt.percentage);
        completedQuizzes++;
      }
    }

    if (completedQuizzes === 0) return;

    const averageGrade = totalPercentage / completedQuizzes;

    await Module.findByIdAndUpdate(moduleId, {
      $set: {
        courseGrade: Math.round(averageGrade),
      }
    });

    console.log(`✅ Module ${moduleId} grade updated to ${Math.round(averageGrade)}%`);
  } catch (error) {
    console.error("❌ Error recalculating module grade:", error);
  }
};
