import winston from 'winston';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info');

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
  silent: process.env.NODE_ENV === 'test' && !process.env.TEST_LOG,
});

export default logger;
