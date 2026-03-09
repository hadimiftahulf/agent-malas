import { config } from './config.js';
import { logger } from './logger.js';
import { getTodayMetrics, getTasks, getPRs } from './db.js';
import axios from 'axios';

/**
 * Sends a detailed daily standup to WhatsApp using Fontte API
 */
export async function sendDailyStandup() {
  const today = getTodayMetrics();
  const tasksCompleted = today.tasks_completed || 0;
  const tasksFailed = today.tasks_failed || 0;
  const prsCreated = today.prs_created || 0;
  const prsRevised = today.prs_revised || 0;

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would send detailed daily standup to WhatsApp via Fonnte`);
    logger.info(`Tasks: ${tasksCompleted} completed, ${tasksFailed} failed`);
    logger.info(`PRs: ${prsCreated} created, ${prsRevised} revised`);
    return;
  }

  if (!config.fontteToken || !config.whatsappTarget) {
    logger.warn('FONNTE_TOKEN or WHATSAPP_TARGET is missing. Cannot send daily standup.');
    return;
  }

  try {
    // Get detailed task and PR data from today
    const completedTasks = getTasks({
      status: 'done',
      limit: 50
    }).data.filter(task => {
      const taskDate = new Date(task.updated_at || task.created_at);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    });

    const failedTasks = getTasks({
      status: 'failed',
      limit: 50
    }).data.filter(task => {
      const taskDate = new Date(task.updated_at || task.created_at);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    });

    const todayPRs = getPRs({
      limit: 50
    }).data.filter(pr => {
      const prDate = new Date(pr.created_at);
      const today = new Date();
      return prDate.toDateString() === today.toDateString();
    });

    // Remove duplicates by ID and URL
    const uniquePRs = Array.from(
      new Map(todayPRs.map(pr => [pr.url || pr.id, pr])).values()
    );

    // Group tasks by project
    const tasksByProject = {};
    completedTasks.forEach(task => {
      const project = task.projectName || 'Unknown Project';
      if (!tasksByProject[project]) {
        tasksByProject[project] = [];
      }
      tasksByProject[project].push(task);
    });

    // Group PRs by repo
    const prsByRepo = {};
    uniquePRs.forEach(pr => {
      const repo = pr.repo || 'Unknown Repo';
      if (!prsByRepo[repo]) {
        prsByRepo[repo] = [];
      }
      prsByRepo[repo].push(pr);
    });

    // Build detailed message with better formatting
    let message = `🤖 *Agent Malas Daily Standup*\n`;
    message += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    // Summary
    message += `📊 *SUMMARY*\n`;
    message += `✅ Tasks Completed: ${tasksCompleted}\n`;
    message += `❌ Tasks Failed: ${tasksFailed}\n`;
    message += `🔀 PRs Created: ${prsCreated}\n`;
    message += `🔄 PRs Revised: ${prsRevised}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Detailed tasks by project
    if (Object.keys(tasksByProject).length > 0) {
      message += `📋 *TASKS COMPLETED BY PROJECT*\n\n`;

      for (const [project, tasks] of Object.entries(tasksByProject)) {
        message += `🏗️ *${project}*\n`;
        message += `   Total: ${tasks.length} task(s)\n\n`;

        tasks.forEach((task, idx) => {
          const title = task.title.length > 60 ? task.title.substring(0, 60) + '...' : task.title;
          message += `   ${idx + 1}. ${title}\n`;
          message += `      📌 Issue #${task.id}\n`;
          if (task.repo) {
            message += `      📦 ${task.repo}\n`;
          }
          if (task.pr_number) {
            message += `      🔗 PR #${task.pr_number}\n`;
          }
          message += `\n`;
        });
      }
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    // Failed tasks detail
    if (failedTasks.length > 0) {
      message += `⚠️ *FAILED TASKS*\n\n`;
      failedTasks.forEach((task, idx) => {
        const title = task.title.length > 60 ? task.title.substring(0, 60) + '...' : task.title;
        message += `${idx + 1}. ${title}\n`;
        message += `   📌 Issue #${task.id}\n`;
        if (task.repo) {
          message += `   📦 ${task.repo}\n`;
        }
        if (task.error_message) {
          const error = task.error_message.substring(0, 80);
          message += `   ❌ ${error}...\n`;
        }
        message += `\n`;
      });
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    // PRs by repository
    if (Object.keys(prsByRepo).length > 0) {
      message += `🔀 *PULL REQUESTS BY REPOSITORY*\n\n`;

      for (const [repo, prs] of Object.entries(prsByRepo)) {
        message += `� *${repo}*\n`;
        message += `   Total: ${prs.length} PR(s)\n\n`;

        prs.forEach((pr, idx) => {
          const title = (pr.title || `PR #${pr.id}`);
          const shortTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;

          message += `   ${idx + 1}. ${shortTitle}\n`;

          if (pr.url) {
            message += `      🔗 ${pr.url}\n`;
          }

          // Status
          const statusEmoji = {
            'open': '🟢',
            'merged': '🟣',
            'closed': '⚫'
          };
          message += `      ${statusEmoji[pr.status] || '📊'} Status: ${pr.status || 'open'}\n`;

          // Review decision
          if (pr.review_decision) {
            const reviewEmoji = {
              'approved': '✅',
              'changes_requested': '🔴',
              'pending': '⏳',
              'revised': '📝'
            };
            const reviewText = pr.review_decision.replace('_', ' ');
            message += `      ${reviewEmoji[pr.review_decision] || '📝'} Review: ${reviewText}\n`;
          }

          if (pr.task_id) {
            message += `      🔗 Task #${pr.task_id}\n`;
          }
          message += `\n`;
        });
      }
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    // Performance stats
    const totalTasks = tasksCompleted + tasksFailed;
    const successRate = totalTasks > 0 ? ((tasksCompleted / totalTasks) * 100).toFixed(1) : 0;

    message += `📈 *PERFORMANCE*\n`;
    message += `🎯 Success Rate: ${successRate}%\n`;
    message += `⚡ Productivity: ${totalTasks} tasks processed\n`;
    message += `🔥 PR Activity: ${prsCreated + prsRevised} actions\n\n`;

    // Footer
    message += `_Tetap malas secara manual, biar bot yang kerja!_\n\n`;
    message += `Sent via fonnte.com`;

    logger.info(`Sending Detailed Daily Standup to ${config.whatsappTarget}...`);

    const response = await axios.post('https://api.fonnte.com/send', {
      target: config.whatsappTarget,
      message: message,
      countryCode: '62'
    }, {
      headers: {
        'Authorization': config.fontteToken
      }
    });

    logger.info('Detailed Daily Standup sent successfully.');
    logger.info(`Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    logger.error(`Failed to send Daily Standup: ${error.message}`);
    if (error.response) {
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

/**
 * Send immediate task completion notification
 */
export async function sendTaskCompletionNotification(task, prNumber) {
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would send task completion notification for #${task.id}`);
    return;
  }

  if (!config.fontteToken || !config.whatsappTarget) {
    return;
  }

  try {
    const title = task.title.length > 60 ? task.title.substring(0, 60) + '...' : task.title;

    let message = `✅ *Task Completed!*\n\n`;
    message += `📌 *${title}*\n`;
    message += `🆔 Issue #${task.id}\n`;
    if (task.repo) {
      message += `📦 Repo: ${task.repo}\n`;
    }
    if (task.projectName) {
      message += `🏗️ Project: ${task.projectName}\n`;
    }
    if (prNumber) {
      message += `🔀 PR #${prNumber} created\n`;
    }
    message += `\n_Agent Malas is working hard!_ 🤖`;

    await axios.post('https://api.fonnte.com/send', {
      target: config.whatsappTarget,
      message: message,
      countryCode: '62'
    }, {
      headers: {
        'Authorization': config.fontteToken
      }
    });

    logger.info(`Task completion notification sent for #${task.id}`);
  } catch (error) {
    logger.error(`Failed to send task notification: ${error.message}`);
  }
}

/**
 * Send task failure notification
 */
export async function sendTaskFailureNotification(task, errorMessage) {
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would send task failure notification for #${task.id}`);
    return;
  }

  if (!config.fontteToken || !config.whatsappTarget) {
    return;
  }

  try {
    const title = task.title.length > 60 ? task.title.substring(0, 60) + '...' : task.title;

    let message = `❌ *Task Failed!*\n\n`;
    message += `📌 *${title}*\n`;
    message += `🆔 Issue #${task.id}\n`;
    if (task.repo) {
      message += `📦 Repo: ${task.repo}\n`;
    }
    if (errorMessage) {
      const error = errorMessage.substring(0, 150);
      message += `\n⚠️ Error:\n${error}...\n`;
    }
    message += `\n_Manual intervention may be required_ 🔧`;

    await axios.post('https://api.fonnte.com/send', {
      target: config.whatsappTarget,
      message: message,
      countryCode: '62'
    }, {
      headers: {
        'Authorization': config.fontteToken
      }
    });

    logger.info(`Task failure notification sent for #${task.id}`);
  } catch (error) {
    logger.error(`Failed to send failure notification: ${error.message}`);
  }
}
