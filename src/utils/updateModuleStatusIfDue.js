const updateModuleStatusIfDue = (module) => {
    if (!module || module.moduleStatus === 'completed') return;
  
    if (['new', 'on-track'].includes(module.moduleStatus)) {
      const dueDate = new Date(module.createdAt);
      dueDate.setDate(dueDate.getDate() + module.timeline);
  
      const now = new Date();
      if (now > dueDate) {
        module.moduleStatus = 'late';
      }
    }
  };
  
  module.exports = updateModuleStatusIfDue;
  