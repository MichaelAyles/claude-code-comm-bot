import winston from 'winston';
import fs from 'fs';
import path from 'path';

const loggers = new Map();

export function createLogger(component, logDir) {
  const loggerKey = `${component}-${logDir || 'default'}`;
  
  if (loggers.has(loggerKey)) {
    return loggers.get(loggerKey);
  }

  const level = process.env.LOG_LEVEL || 'info';
  const logDirectory = logDir || path.join(process.cwd(), 'logs');

  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  const logger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { component },
    transports: [
      new winston.transports.File({
        filename: path.join(logDirectory, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDirectory, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ level, message, component, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${component}] ${level}: ${message} ${metaStr}`;
          })
        ),
      })
    );
  }

  loggers.set(loggerKey, logger);
  return logger;
}

export function getLogger(component) {
  return loggers.get(`${component}-default`) || createLogger(component);
}