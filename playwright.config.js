const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['cycle.test.js', 'live.test.js', 'voice.test.js'],
  timeout: 30000,
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off'
  },
  reporter: [['list'], ['html', { open: 'never' }]]
});
