
require('dotenv').config();
const { Command } = require('commander');
const { connect } = require('../db');
const queue = require('../services/queueService');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const path = require('path');

const program = new Command();

program.name('queuectl').description('QueueCTL - CLI for job queue').version('0.1.0');

program
  .command('enqueue <jobJson>')
  .description('Enqueue job JSON string')
  .action(async (jobJson) => {
    await connect();
    try {
      const parsed = JSON.parse(jobJson);
      if (!parsed.id || !parsed.command) throw new Error('job must have id and command');
      await queue.enqueue(parsed);
      console.log('Enqueued job', parsed.id);
      process.exit(0);
    } catch (err) {
      console.error('Error enqueuing job:', err.message);
      process.exit(1);
    }
  });

program
  .command('worker start')
  .option('--count <n>', 'number of worker processes', '1')
  .description('Start worker(s) locally (spawns processes)')
  .action(async (opts) => {
    const count = parseInt(opts.count || 1, 10);
    for (let i = 0; i < count; i++) {
      const p = spawn('node', [path.join(__dirname, '..', 'workers', 'worker.js')], { stdio: 'inherit' });
      logger.info(`Spawned worker pid=${p.pid}`);
    }
  });

program
  .command('status')
  .description('Show job counts by state')
  .action(async () => {
    await connect();
    const stats = await queue.getStats();
    console.table(stats);
    process.exit(0);
  });

program
  .command('list')
  .option('--state <state>', 'state filter', 'pending')
  .description('List jobs by state')
  .action(async (opts) => {
    await connect();
    const jobs = await queue.listByState(opts.state);
    console.table(jobs.map(j => ({ id: j.id, command: j.command, attempts: j.attempts, state: j.state, next_run_at: j.next_run_at })));
    process.exit(0);
  });

program
  .command('dlq list')
  .description('List DLQ jobs (state=dead)')
  .action(async () => {
    await connect();
    const jobs = await queue.listByState('dead');
    console.table(jobs.map(j => ({ id: j.id, command: j.command, last_error: j.last_error })));
    process.exit(0);
  });

program
  .command('dlq retry <jobId>')
  .description('Retry a dead job (move back to pending)')
  .action(async (jobId) => {
    await connect();
    await queue.dlqRetry(jobId);
    console.log('DLQ retry scheduled for', jobId);
    process.exit(0);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
