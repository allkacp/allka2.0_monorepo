// PM2 config — cPanel Node.js App
// Uso: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'allka-api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
