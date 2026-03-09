/**
 * Retry helper untuk handle transient errors
 */
import { logger } from './logger.js';

/**
 * Retry operation dengan exponential backoff
 */
export async function retryWithBackoff(
    operation,
    options = {}
) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        onRetry = null,
        shouldRetry = null,
    } = options;

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation(attempt);
        } catch (error) {
            lastError = error;

            // Check if we should retry this error
            if (shouldRetry && !shouldRetry(error)) {
                throw error;
            }

            // Last attempt - don't wait
            if (attempt === maxRetries - 1) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            );

            logger.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`);

            if (onRetry) {
                await onRetry(error, attempt, delay);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Retry specifically untuk git operations
 */
export async function retryGitOperation(operation, operationName = 'git operation') {
    return retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 2000,
        shouldRetry: (error) => {
            // Retry on network errors, but not on auth or conflict errors
            const message = error.message.toLowerCase();
            const retryableErrors = [
                'network',
                'timeout',
                'connection',
                'econnrefused',
                'enotfound',
                'etimedout',
            ];

            const nonRetryableErrors = [
                'authentication',
                'permission denied',
                'conflict',
                'already exists',
            ];

            if (nonRetryableErrors.some(err => message.includes(err))) {
                return false;
            }

            return retryableErrors.some(err => message.includes(err));
        },
        onRetry: (error, attempt, delay) => {
            logger.info(`${operationName} failed, retrying... (${attempt + 1}/3)`);
        },
    });
}

/**
 * Retry untuk GitHub API calls
 */
export async function retryGitHubAPI(operation, operationName = 'GitHub API call') {
    return retryWithBackoff(operation, {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        shouldRetry: (error) => {
            const message = error.message.toLowerCase();
            const stderr = error.stderr?.toLowerCase() || '';

            // Retry on rate limit, server errors, network errors
            const retryablePatterns = [
                'rate limit',
                'api rate limit exceeded',
                'secondary rate limit',
                'server error',
                'bad gateway',
                'service unavailable',
                'timeout',
                'network',
                'econnrefused',
                'enotfound',
            ];

            return retryablePatterns.some(pattern =>
                message.includes(pattern) || stderr.includes(pattern)
            );
        },
        onRetry: async (error, attempt, delay) => {
            logger.warn(`${operationName} failed: ${error.message}`);

            // If rate limited, wait longer
            if (error.message.toLowerCase().includes('rate limit')) {
                logger.warn('GitHub API rate limit hit. Waiting longer...');
                // Add extra delay for rate limits
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        },
    });
}

/**
 * Retry untuk WhatsApp/Fonnte API
 */
export async function retryWhatsAppAPI(operation, operationName = 'WhatsApp API call') {
    return retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 2000,
        shouldRetry: (error) => {
            // Retry on network errors and 5xx errors
            if (error.response) {
                const status = error.response.status;
                return status >= 500 || status === 429; // Server errors or rate limit
            }

            // Network errors
            const message = error.message.toLowerCase();
            return message.includes('network') ||
                message.includes('timeout') ||
                message.includes('econnrefused');
        },
        onRetry: (error, attempt, delay) => {
            logger.warn(`${operationName} failed, retrying in ${delay}ms...`);
        },
    });
}

/**
 * Execute operation dengan timeout
 */
export async function withTimeout(operation, timeoutMs, timeoutMessage = 'Operation timed out') {
    return Promise.race([
        operation(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
    ]);
}

/**
 * Circuit breaker pattern untuk prevent cascading failures
 */
export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute
        this.failures = 0;
        this.state = 'closed'; // closed, open, half-open
        this.nextAttempt = Date.now();
    }

    async execute(operation) {
        if (this.state === 'open') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN - too many failures');
            }
            // Try to recover
            this.state = 'half-open';
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'closed';
    }

    onFailure() {
        this.failures++;
        if (this.failures >= this.failureThreshold) {
            this.state = 'open';
            this.nextAttempt = Date.now() + this.resetTimeout;
            logger.error(`Circuit breaker opened after ${this.failures} failures. Will retry after ${this.resetTimeout}ms`);
        }
    }

    reset() {
        this.failures = 0;
        this.state = 'closed';
        this.nextAttempt = Date.now();
    }
}
