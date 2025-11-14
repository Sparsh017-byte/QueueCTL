function exponentialBackoff(base, attempts) {
  // base ^ attempts (in seconds) -> return milliseconds
  const secs = Math.pow(base, attempts);
  return Math.floor(secs * 1000);
}
module.exports = { exponentialBackoff };