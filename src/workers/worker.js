#!/usr/bin/env node
require('dotenv').config();
const { spawn } = require('child_process');
const { connect } = require('../db');
const queue = require('../services/queueService');
const logger = require('../utils/logger');

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL_MS || 1000);
let running = true;

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function runWorker() {
  await connect();
  logger.info('Worker started');
  while (running) {
    try {
      const job = await queue.atomicFetchAndLock();
      if (!job) {
        
        await new Promise(res => setTimeout(res, POLL_INTERVAL));
        continue;
      }
      logger.info(`Picked job ${job.id} (attempt ${job.attempts}) - executing: ${job.command}`);
      await executeCommand(job);
    } catch (err) {
      logger.error('Worker loop error: ' + err.stack);
      await new Promise(res => setTimeout(res, POLL_INTERVAL));
    }
  }
  logger.info('Worker exiting');
  process.exit(0);
}

function executeCommand(job) {
  return new Promise((resolve) => {
    
    const parts = job.command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

    child.on('close', async (code) => {
      if (code === 0) {
        await queue.markCompleted(job.id);
        logger.info(`Job ${job.id} completed`);
      } else {
        const errMsg = `Exit code ${code}`;
        await queue.markFailed(job, errMsg);
        logger.warn(`Job ${job.id} failed: ${errMsg}`);
      }
      resolve();
    });

    child.on('error', async (err) => {
      
      const errMsg = err.message;
      await queue.markFailed(job, errMsg);
      logger.error(`Job ${job.id} spawn error: ${errMsg}`);
      resolve();
    });
  });
}

function shutdown() {
  logger.info('Shutdown signal received: finishing current job then stop');
  running = false;
}

runWorker();
