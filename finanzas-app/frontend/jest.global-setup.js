// Date tests assert local-calendar behavior for customers in UTC-4/-5.
// TZ must be set before Jest spawns its workers: assigning process.env.TZ
// inside a test file is too late for the Date implementation to pick it up,
// so the suite passed on a Havana machine and failed in UTC CI.
module.exports = async () => {
  process.env.TZ = 'America/Havana';
};
