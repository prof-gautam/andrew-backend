/**
 * Evaluates a multiple-choice or true/false question.
 * @param {Object} question - The question object from the quiz.
 * @param {Object} userAnswer - The user's submitted answer.
 * @returns {{ isCorrect: boolean, answer: string }}
 */
exports.evaluateMCQorTrueFalse = (question, userAnswer) => {
    const answer = userAnswer?.answer || ''
    const isCorrect = answer === question.correctAnswer
    return { isCorrect, answer }
  }
  
  /**
   * Placeholder for evaluating open-ended questions (manual grading required)
   */
  exports.evaluateOpenEnded = (question, userAnswer) => {
    return {
      isCorrect: null, // Open-ended questions are not auto-graded
      answer: userAnswer?.answer || '',
    }
  }
  
  /**
   * Placeholder for evaluating coding questions (to be implemented)
   */
  exports.evaluateCoding = (question, userAnswer) => {
    return {
      isCorrect: null, // Could add logic later for test cases
      answer: userAnswer?.answer || '',
    }
  }
  