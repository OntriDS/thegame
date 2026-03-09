/**
 * Logger utility for pixelbrain integration
 *
 * Provides a structured logging interface consistent with the usage
 * patterns in pixelbrain-related files. Routes to console methods
 * with structured metadata support.
 *
 * @module lib/utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

function formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (meta && Object.keys(meta).length > 0) {
        return `${prefix} ${message} ${JSON.stringify(meta)}`;
    }
    return `${prefix} ${message}`;
}

function createLogger() {
    const isDev = process.env.NODE_ENV !== 'production';
    const logLevel: LogLevel = (process.env.PIXELBRAIN_LOG_LEVEL as LogLevel) || 'info';

    const levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    function shouldLog(level: LogLevel): boolean {
        return levels[level] >= levels[logLevel];
    }

    return {
        debug(message: string, meta?: LogMeta): void {
            if (isDev && shouldLog('debug')) {
                console.debug(formatMessage('debug', message, meta));
            }
        },

        info(message: string, meta?: LogMeta): void {
            if (shouldLog('info')) {
                console.info(formatMessage('info', message, meta));
            }
        },

        warn(message: string, meta?: LogMeta): void {
            if (shouldLog('warn')) {
                console.warn(formatMessage('warn', message, meta));
            }
        },

        error(message: string, meta?: LogMeta): void {
            if (shouldLog('error')) {
                console.error(formatMessage('error', message, meta));
            }
        },
    };
}

export const logger = createLogger();

export type Logger = ReturnType<typeof createLogger>;
