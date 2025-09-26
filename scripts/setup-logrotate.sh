#!/bin/bash
sudo tee /etc/logrotate.d/nodejs-app << EOF
/home/ec2-user/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF