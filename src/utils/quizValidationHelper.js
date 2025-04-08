const validQuizTypes = ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'];
const validDifficulties = ['Easy', 'Medium', 'Hard'];

const validateQuizConfig = (quizConfig) => {
    const errors = [];

    if (quizConfig.quizTypes) {
        if (!Array.isArray(quizConfig.quizTypes)) {
            errors.push('quizTypes must be an array.');
        } else if (!quizConfig.quizTypes.every(type => validQuizTypes.includes(type))) {
            errors.push(`Invalid quizTypes. Allowed: ${validQuizTypes.join(', ')}`);
        }
    }

    if (quizConfig.difficultyLevel && !validDifficulties.includes(quizConfig.difficultyLevel)) {
        errors.push(`Invalid difficultyLevel. Allowed: ${validDifficulties.join(', ')}`);
    }

    if (
        quizConfig.numberOfQuestions &&
        (typeof quizConfig.numberOfQuestions !== 'number' || quizConfig.numberOfQuestions <= 0)
    ) {
        errors.push('numberOfQuestions must be a positive number.');
    }

    if (quizConfig.isTimed !== undefined && typeof quizConfig.isTimed !== 'boolean') {
        errors.push('isTimed must be a boolean.');
    }

    if (
        quizConfig.timeDuration !== undefined &&
        (typeof quizConfig.timeDuration !== 'number' || quizConfig.timeDuration <= 0)
    ) {
        errors.push('timeDuration must be a positive number.');
    }

    return errors;
};

module.exports = { validateQuizConfig };
