// PM2 конфиг для Timeweb VDS.
// Запуск: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "oblako",
      script: ".output/server/index.mjs",
      cwd: "/var/www/oblako",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
      max_memory_restart: "512M",
    },
  ],
};
