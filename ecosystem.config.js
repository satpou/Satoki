module.exports = {
  apps: [{
    name: 'satpou-bot',
    script: 'bot.js',
    watch: false,
    restart_delay: 5000,
    max_restarts: 10
  }]
};