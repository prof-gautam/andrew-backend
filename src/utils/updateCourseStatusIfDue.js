const updateCourseStatusIfDue = (course) => {
    if (!course || course.courseStatus === 'completed') return;
  
    if (['new', 'on-track'].includes(course.courseStatus)) {
      const dueDate = new Date(course.createdAt);
      dueDate.setDate(dueDate.getDate() + course.timeline);
  
      const now = new Date();
      if (now > dueDate) {
        course.courseStatus = 'late';
      }
    }
  };
  
  module.exports = updateCourseStatusIfDue;
  