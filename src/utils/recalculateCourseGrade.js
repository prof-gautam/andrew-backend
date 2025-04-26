const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Quiz = require("../models/quizModel");

exports.recalculateCourseGrade = async (courseId) => {
  try {
    if (!courseId) return;

    const course = await Course.findById(courseId);
    if (!course) {
      console.error("❌ Course not found while recalculating course grade.");
      return;
    }

    const modules = await Module.find({ courseId });

    if (!modules || modules.length === 0) {
      console.error("❌ No modules found for course:", courseId);
      return;
    }

    let totalObtainedMarks = 0;
    let totalMaxMarks = 0;
    let completedModules = 0;
    let firstIncompleteModule = null;

    for (const module of modules) {
      if (module.isCompleted) {
        completedModules++;
      } else if (!firstIncompleteModule) {
        firstIncompleteModule = module._id;
      }

      // Get all quizzes inside this module
      const quizzes = await Quiz.find({ moduleId: module._id });

      for (const quiz of quizzes) {
        if (quiz.attempts && quiz.attempts.length > 0) {
          // Find the latest completed attempt
          const latestAttempt = quiz.attempts
            .filter((a) => a.isCompleted)
            .sort((a, b) => b.attemptNumber - a.attemptNumber)[0];

          if (latestAttempt) {
            totalObtainedMarks += latestAttempt.obtainedMarks;
            totalMaxMarks += quiz.maxScore;
          }
        }
      }
    }

    let courseGrade = 0;
    if (totalMaxMarks > 0) {
      courseGrade = ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2);
    }

    // ✅ Update learningSummary
    course.learningSummary.totalModules = modules.length;
    course.learningSummary.completedModules = completedModules;
    course.learningSummary.courseGrade = parseFloat(courseGrade);
    course.learningSummary.firstIncompleteModule = firstIncompleteModule || null;

    await course.save();
    console.log(`✅ Course grade recalculated based on taken quizzes for courseId: ${courseId}`);
  } catch (error) {
    console.error("❌ Error recalculating course grade:", error);
  }
};
