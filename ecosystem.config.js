module.exports = {
  apps: [
    {
      name: "mehndigo-backend-cluster",
      script: "./backend/server.js",
      instances: "max", // Scale across all available CPU cores
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G", // Reboot process if it leaks above 1GB
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2_err.log",
      out_file: "./logs/pm2_out.log",
      combine_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3000
      }
    }
  ]
};
