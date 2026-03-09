/**
 * Shared agent state — avoids circular dependency between index.js and api routes.
 */
const agentState = {
  status: 'idle',       // 'running' | 'idle' | 'stopped'
  currentTask: null,    // current task title or null
  lastRun: null,        // ISO timestamp of last run
};

export function getAgentState() {
  return { ...agentState };
}

export function setAgentStatus(status) {
  agentState.status = status;
}

export function setCurrentTask(taskTitle) {
  agentState.currentTask = taskTitle;
}

export function setLastRun(isoDate) {
  agentState.lastRun = isoDate;
}
