#!/bin/bash

# Create CloudWatch config
cat > /tmp/cloudwatch-config.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/game-review/server/logs/combined.log",
            "log_group_name": "/aws/ec2/game-review-server",
            "log_stream_name": "{instance_id}/combined",
            "retention_in_days": 7,
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/game-review/server/logs/error.log",
            "log_group_name": "/aws/ec2/game-review-server",
            "log_stream_name": "{instance_id}/error",
            "retention_in_days": 7,
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/game-review/server/logs/api-errors.log",
            "log_group_name": "/aws/ec2/game-review-server",
            "log_stream_name": "{instance_id}/api-errors",
            "retention_in_days": 7,
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/game-review/server/logs/app.log",
            "log_group_name": "/aws/ec2/game-review-server",
            "log_stream_name": "{instance_id}/app",
            "retention_in_days": 7,
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/game-review-server",
            "log_stream_name": "{instance_id}/syslog",
            "retention_in_days": 7,
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF

# Download and install CloudWatch agent
cd /tmp
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure and start the agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/tmp/cloudwatch-config.json \
    -s

# Enable on boot
sudo systemctl enable amazon-cloudwatch-agent

# Check status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -m ec2 \
    -a query