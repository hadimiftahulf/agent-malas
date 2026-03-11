import { config } from './config.js';
import { logger } from './logger.js';
import { getTodayMetrics, getTasks, getPRs } from './db.js';
import axios from 'axios';

/**
 * Helper function to get all WhatsApp targets (individual + groups)
 */
function getAllWhatsAppTargets() {
    const targets = [];

    // Legacy single target
    if (config.whatsappTarget) {
        targets.push(config.whatsappTarget);
    }

    // Multiple individual targets
    if (config.whatsappTargets) {
        const multipleTargets = config.whatsappTargets.split(',').map(t => t.trim()).filter(t => t);
        targets.push(...multipleTargets);
    }

    // Group targets
    if (config.whatsappGroups) {
        const groupTargets = config.whatsappGroups.split(',').map(t => t.trim()).filter(t => t);
        targets.push(...groupTargets);
    }

    // Remove duplicates
    return [...new Set(targets)];
}

/**
 * Enhanced function to send WhatsApp message to multiple targets
 */
async function sendWhatsAppMessage(message, options = {}) {
    if (!config.fontteToken) {
        logger.warn('FONTTE_TOKEN is missing. Cannot send WhatsApp message.');
        return { success: false, error: 'Missing FONTTE_TOKEN' };
    }

    const targets = getAllWhatsAppTargets();

    if (targets.length === 0) {
        logger.warn('No WhatsApp targets configured. Set WHATSAPP_TARGET, WHATSAPP_TARGETS, or WHATSAPP_GROUPS.');
        return { success: false, error: 'No targets configured' };
    }

    const results = [];

    for (const target of targets) {
        try {
            logger.info(`📱 Sending WhatsApp message to ${target}...`);

            const payload = {
                target: target,
                message: message,
                countryCode: '62',
                ...options
            };

            const response = await axios.post('https://api.fontte.com/send', payload, {
                headers: {
                    'Authorization': config.fontteToken
                }
            });

            results.push({
                target,
                success: true,
                response: response.data
            });

            logger.info(`✅ Message sent successfully to ${target}`);

            // Small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            logger.error(`❌ Failed to send message to ${target}: ${error.message}`);

            results.push({
                target,
                success: false,
                error: error.message,
                response: error.response?.data
            });
        }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    logger.info(`📊 WhatsApp broadcast complete: ${successCount}/${totalCount} messages sent successfully`);

    return {
        success: successCount > 0,
        results,
        summary: {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount
        }
    };
}

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
        logger.info(`[DRY RUN] Would send detailed daily standup to WhatsApp via Fontte`);
        logger.info(`Tasks: ${tasksCompleted} completed, ${tasksFailed} failed`);
        logger.info(`PRs: ${prsCreated} created, ${prsRevised} revised`);
        return;
    }

    const targets = getAllWhatsAppTargets();
    if (!config.fontteToken || targets.length === 0) {
        logger.warn('FONTTE_TOKEN is missing or no WhatsApp targets configured. Cannot send daily standup.');
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
                message += `📦 *${repo}*\n`;
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
        message += `Sent via fontte.com`;

        logger.info(`📤 Sending Detailed Daily Standup to ${targets.length} WhatsApp target(s)...`);

        const result = await sendWhatsAppMessage(message);

        if (result.success) {
            logger.info(`✅ Daily Standup sent successfully to ${result.summary.success}/${result.summary.total} targets.`);
        } else {
            logger.error(`❌ Failed to send Daily Standup: ${result.error || 'Unknown error'}`);
        }

        return result;

    } catch (error) {
        logger.error(`Failed to send Daily Standup: ${error.message}`);
        if (error.response) {
            logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
        return { success: false, error: error.message };
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

    const targets = getAllWhatsAppTargets();
    if (!config.fontteToken || targets.length === 0) {
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

        const result = await sendWhatsAppMessage(message);

        if (result.success) {
            logger.info(`✅ Task completion notification sent for #${task.id} to ${result.summary.success} targets`);
        } else {
            logger.error(`❌ Failed to send task completion notification: ${result.error}`);
        }

        return result;

    } catch (error) {
        logger.error(`Failed to send task notification: ${error.message}`);
        return { success: false, error: error.message };
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

    const targets = getAllWhatsAppTargets();
    if (!config.fontteToken || targets.length === 0) {
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

        const result = await sendWhatsAppMessage(message);

        if (result.success) {
            logger.info(`✅ Task failure notification sent for #${task.id} to ${result.summary.success} targets`);
        } else {
            logger.error(`❌ Failed to send task failure notification: ${result.error}`);
        }

        return result;

    } catch (error) {
        logger.error(`Failed to send failure notification: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test function to send a message to all configured targets
 */
export async function testWhatsAppBroadcast() {
    const targets = getAllWhatsAppTargets();

    console.log('📱 WhatsApp Broadcast Test');
    console.log('─'.repeat(50));
    console.log(`🎯 Configured targets: ${targets.length}`);

    if (targets.length === 0) {
        console.log('❌ No targets configured!');
        console.log('');
        console.log('💡 Configure targets in .env:');
        console.log('   WHATSAPP_TARGET=6289656012756');
        console.log('   WHATSAPP_TARGETS=6289656012756,6281234567890,6287654321098');
        console.log('   WHATSAPP_GROUPS=120363123456789012@g.us,120363987654321098@g.us');
        return;
    }

    targets.forEach((target, i) => {
        const isGroup = target.includes('@g.us');
        console.log(`   ${i + 1}. ${target} ${isGroup ? '👥 (Group)' : '👤 (Individual)'}`);
    });

    console.log('');

    if (config.dryRun) {
        console.log('🧪 DRY RUN MODE - No messages will be sent');
        return;
    }

    const testMessage = `🧪 *WhatsApp Broadcast Test*\n\n` +
        `📅 ${new Date().toLocaleString('id-ID')}\n` +
        `🤖 Agent Malas broadcast system is working!\n\n` +
        `📊 Targets configured: ${targets.length}\n` +
        `✅ This message was sent to all configured targets.\n\n` +
        `_Test completed successfully!_`;

    console.log('📤 Sending test message...');

    const result = await sendWhatsAppMessage(testMessage);

    console.log('');
    console.log('📊 Results:');
    console.log(`   ✅ Success: ${result.summary.success}/${result.summary.total}`);
    console.log(`   ❌ Failed: ${result.summary.failed}/${result.summary.total}`);

    if (result.results) {
        console.log('');
        console.log('📋 Detailed Results:');
        result.results.forEach((res, i) => {
            const status = res.success ? '✅' : '❌';
            const isGroup = res.target.includes('@g.us');
            const type = isGroup ? '👥' : '👤';
            console.log(`   ${i + 1}. ${status} ${res.target} ${type}`);
            if (!res.success) {
                console.log(`      Error: ${res.error}`);
            }
        });
    }

    return result;
}