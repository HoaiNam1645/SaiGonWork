// PM2 ecosystem — chạy trên server với:
//   pm2 start deploy/pm2/ecosystem.config.js
//   pm2 save && pm2 startup
//
// Cấu trúc thư mục mặc định trên server (rsync split):
//   /var/www/sai-gon-work/
//     ├── frontend/    (Next.js, đã chạy `npm run build`)
//     └── backend/     (Express, đã chạy `npm run build`)

module.exports = {
  apps: [
    {
      // Frontend Next.js
      name:        'sgw-frontend',
      cwd:         '/var/www/sai-gon-work/frontend',
      script:      'node_modules/next/dist/bin/next',
      args:        'start -p 5175',
      instances:   1,
      exec_mode:   'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT:     '5175',
      },
      // Logs
      out_file:  '/var/log/pm2/sgw-frontend.out.log',
      error_file:'/var/log/pm2/sgw-frontend.err.log',
      merge_logs: true,
      time:       true,
    },
    {
      // Backend Express + Prisma
      name:        'sgw-backend',
      cwd:         '/var/www/sai-gon-work/backend',
      script:      'dist/server.js',
      instances:   1,
      exec_mode:   'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT:     '4000',
      },
      out_file:  '/var/log/pm2/sgw-backend.out.log',
      error_file:'/var/log/pm2/sgw-backend.err.log',
      merge_logs: true,
      time:       true,
    },
  ],
}
