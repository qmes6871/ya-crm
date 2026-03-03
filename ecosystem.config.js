module.exports = {
  apps: [{
    name: 'ya-crm',
    script: 'node_modules/.bin/next',
    args: 'start -p 3002',
    cwd: '/var/www/crm',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
