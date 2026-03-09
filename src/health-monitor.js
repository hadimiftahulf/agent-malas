/**
 * Health monitoring dan alerting system
 */
import { logger } from './logger.js';
import { getDb, getTasks, getPRs } from './db.js';
import { getAgentState } from './agent-state.js';
import { broadcast } from './websocket.js';
import { cleanupStuckTasks } from './db-transactions.js';

class HealthMonitor {
    constructor() {
        this.checks = [];
        this.metrics = {
            memoryUsage: [],
            taskProcessingTime: [],
            apiResponseTime: [],
            errorRate: [],
        };
        this.alerts = [];
        this.isRunning = false;
    }

    /**
     * Register health check
     */
    registerCheck(name, checkFn, interval = 60000) {
        this.checks.push({ name, checkFn, interval, lastRun: 0 });
    }

    /**
     * Start monitoring
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Register default checks
        this.registerDefaultChecks();

        // Run checks periodically
        this.checkInterval = setInterval(() => {
            this.runChecks();
        }, 30000); // Every 30 seconds

        // Collect metrics periodically
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 60000); // Every minute

        logger.info('Health monitor started');
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.metricsInterval) clearInterval(this.metricsInterval);

        logger.info('Health monitor stopped');
    }

    /**
     * Register default health checks
     */
    registerDefaultChecks() {
        // Check 1: Database connectivity
        this.registerCheck('database', async () => {
            try {
                const db = getDb();
                db.prepare('SELECT 1').get();
                return { status: 'healthy', message: 'Database is accessible' };
            } catch (error) {
                return { status: 'unhealthy', message: `Database error: ${error.message}` };
            }
        });

        // Check 2: Stuck tasks
        this.registerCheck('stuck_tasks', async () => {
            try {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const db = getDb();
                const stuckTasks = db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE status = 'processing' AND started_at < ?
        `).get(oneHourAgo);

                if (stuckTasks.count > 0) {
                    return {
                        status: 'warning',
                        message: `Found ${stuckTasks.count} stuck task(s)`,
                        action: 'cleanup_recommended',
                    };
                }

                return { status: 'healthy', message: 'No stuck tasks' };
            } catch (error) {
                return { status: 'error', message: error.message };
            }
        });

        // Check 3: Memory usage
        this.registerCheck('memory', async () => {
            const usage = process.memoryUsage();
            const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
            const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

            if (percentage > 90) {
                return {
                    status: 'critical',
                    message: `Memory usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${percentage}%)`,
                };
            } else if (percentage > 75) {
                return {
                    status: 'warning',
                    message: `Memory usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${percentage}%)`,
                };
            }

            return {
                status: 'healthy',
                message: `Memory usage normal: ${heapUsedMB}MB / ${heapTotalMB}MB (${percentage}%)`,
            };
        });

        // Check 4: Task queue health
        this.registerCheck('task_queue', async () => {
            try {
                const queuedTasks = getTasks({ status: 'queued', limit: 1000 });
                const processingTasks = getTasks({ status: 'processing', limit: 100 });

                if (queuedTasks.total > 50) {
                    return {
                        status: 'warning',
                        message: `Large queue: ${queuedTasks.total} tasks waiting`,
                    };
                }

                if (processingTasks.total > 5) {
                    return {
                        status: 'warning',
                        message: `Multiple tasks processing: ${processingTasks.total} (possible stuck tasks)`,
                    };
                }

                return {
                    status: 'healthy',
                    message: `Queue healthy: ${queuedTasks.total} queued, ${processingTasks.total} processing`,
                };
            } catch (error) {
                return { status: 'error', message: error.message };
            }
        });

        // Check 5: Failed tasks rate
        this.registerCheck('failure_rate', async () => {
            try {
                const db = getDb();
                const today = new Date().toISOString().split('T')[0];

                const stats = db.prepare(`
          SELECT 
            SUM(tasks_completed) as completed,
            SUM(tasks_failed) as failed
          FROM daily_metrics 
          WHERE date >= date('now', '-7 days')
        `).get();

                const total = (stats.completed || 0) + (stats.failed || 0);
                if (total === 0) {
                    return { status: 'healthy', message: 'No tasks processed recently' };
                }

                const failureRate = Math.round((stats.failed / total) * 100);

                if (failureRate > 50) {
                    return {
                        status: 'critical',
                        message: `High failure rate: ${failureRate}% (${stats.failed}/${total} tasks)`,
                    };
                } else if (failureRate > 25) {
                    return {
                        status: 'warning',
                        message: `Elevated failure rate: ${failureRate}% (${stats.failed}/${total} tasks)`,
                    };
                }

                return {
                    status: 'healthy',
                    message: `Failure rate normal: ${failureRate}% (${stats.failed}/${total} tasks)`,
                };
            } catch (error) {
                return { status: 'error', message: error.message };
            }
        });

        // Check 6: Disk space (workspace directory)
        this.registerCheck('disk_space', async () => {
            try {
                const { execa } = await import('execa');
                const { stdout } = await execa('df', ['-h', './workspace']);
                const lines = stdout.split('\n');

                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    const usagePercent = parseInt(parts[4]);

                    if (usagePercent > 90) {
                        return {
                            status: 'critical',
                            message: `Disk space critical: ${usagePercent}% used`,
                            action: 'cleanup_required',
                        };
                    } else if (usagePercent > 75) {
                        return {
                            status: 'warning',
                            message: `Disk space high: ${usagePercent}% used`,
                        };
                    }

                    return {
                        status: 'healthy',
                        message: `Disk space normal: ${usagePercent}% used`,
                    };
                }

                return { status: 'unknown', message: 'Could not determine disk usage' };
            } catch (error) {
                return { status: 'error', message: `Disk check failed: ${error.message}` };
            }
        });
    }

    /**
     * Run all health checks
     */
    async runChecks() {
        const now = Date.now();
        const results = [];

        for (const check of this.checks) {
            if (now - check.lastRun < check.interval) {
                continue; // Skip if not time yet
            }

            try {
                const result = await check.checkFn();
                check.lastRun = now;

                results.push({
                    name: check.name,
                    ...result,
                    timestamp: new Date().toISOString(),
                });

                // Log warnings and errors
                if (result.status === 'warning') {
                    logger.warn(`[Health Check] ${check.name}: ${result.message}`);
                } else if (result.status === 'unhealthy' || result.status === 'critical' || result.status === 'error') {
                    logger.error(`[Health Check] ${check.name}: ${result.message}`);

                    // Create alert
                    this.createAlert(check.name, result);
                }

                // Auto-remediation
                if (result.action === 'cleanup_recommended') {
                    logger.info('Auto-remediation: Cleaning up stuck tasks...');
                    const cleaned = cleanupStuckTasks();
                    logger.info(`Cleaned up ${cleaned} stuck task(s)`);
                }

            } catch (error) {
                logger.error(`[Health Check] ${check.name} failed: ${error.message}`);
                results.push({
                    name: check.name,
                    status: 'error',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Broadcast health status
        if (results.length > 0) {
            broadcast('health:check', { checks: results });
        }

        return results;
    }

    /**
     * Collect system metrics
     */
    collectMetrics() {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            value: heapUsedMB,
        });

        // Keep only last 60 data points (1 hour if collected every minute)
        if (this.metrics.memoryUsage.length > 60) {
            this.metrics.memoryUsage.shift();
        }

        // Broadcast metrics
        broadcast('metrics:update', {
            memory: heapUsedMB,
            uptime: Math.floor(process.uptime()),
        });
    }

    /**
     * Create alert
     */
    createAlert(checkName, result) {
        const alert = {
            id: `${checkName}-${Date.now()}`,
            check: checkName,
            status: result.status,
            message: result.message,
            timestamp: new Date().toISOString(),
            acknowledged: false,
        };

        this.alerts.push(alert);

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        broadcast('alert:new', alert);
    }

    /**
     * Get current health status
     */
    async getHealthStatus() {
        const checks = await this.runChecks();
        const agentState = getAgentState();

        const overallStatus = checks.some(c => c.status === 'critical' || c.status === 'unhealthy')
            ? 'unhealthy'
            : checks.some(c => c.status === 'warning')
                ? 'degraded'
                : 'healthy';

        return {
            status: overallStatus,
            agent: agentState,
            checks,
            metrics: {
                memory: this.metrics.memoryUsage.slice(-10), // Last 10 minutes
            },
            alerts: this.alerts.filter(a => !a.acknowledged).slice(-10), // Last 10 unacknowledged
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get metrics for dashboard
     */
    getMetrics() {
        return {
            memory: this.metrics.memoryUsage,
            taskProcessingTime: this.metrics.taskProcessingTime,
            apiResponseTime: this.metrics.apiResponseTime,
            errorRate: this.metrics.errorRate,
        };
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
        }
    }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();
