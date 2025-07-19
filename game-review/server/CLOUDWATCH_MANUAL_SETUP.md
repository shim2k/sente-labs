# Manual CloudWatch Setup Instructions

Since we can't access the EC2 instance directly, here are the manual steps to set up CloudWatch Logs.

## What's Already Done

✅ IAM permissions added to your EC2 instance role (EC2-SQS-Worker-Role)
✅ CloudWatch Log Group created: `/aws/ec2/game-review-server`
✅ Configuration files prepared

## Manual Steps Required

### 1. Connect to Your EC2 Instance

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@3.95.154.18
```

### 2. Install CloudWatch Agent

Run these commands on the EC2 instance:

```bash
# Download and install the agent
cd /tmp
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### 3. Create Configuration File

Create the config file on the EC2 instance:

```bash
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json
```

Paste this configuration:

```json
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
          }
        ]
      }
    }
  }
}
```

### 4. Start CloudWatch Agent

```bash
# Start the agent with the config
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json \
    -s

# Enable agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent

# Check agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -m ec2 \
    -a query
```

### 5. Verify Logs are Streaming

After a minute or two, check CloudWatch Logs in AWS Console:

1. Go to CloudWatch → Log groups
2. Click on `/aws/ec2/game-review-server`
3. You should see log streams for your instance

Or use AWS CLI:

```bash
# List log streams
aws logs describe-log-streams \
    --log-group-name /aws/ec2/game-review-server \
    --query 'logStreams[*].logStreamName'

# View recent logs
aws logs tail /aws/ec2/game-review-server --follow
```

## Finding the Data Quality Logs

Once CloudWatch is set up, you can search for the data quality assessment logs:

```bash
# Search for data quality assessments
aws logs filter-log-events \
    --log-group-name /aws/ec2/game-review-server \
    --filter-pattern '"Data quality assessment"' \
    --start-time $(date -u -d '1 hour ago' +%s)000

# Search for insufficient data cases
aws logs filter-log-events \
    --log-group-name /aws/ec2/game-review-server \
    --filter-pattern '"BASIC/LOBBY-ONLY"' \
    --start-time $(date -u -d '1 hour ago' +%s)000
```

## Troubleshooting

If logs aren't appearing:

1. Check the agent is running:
   ```bash
   sudo systemctl status amazon-cloudwatch-agent
   ```

2. Check agent logs:
   ```bash
   sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
   ```

3. Verify log files exist:
   ```bash
   ls -la /home/ubuntu/game-review/server/logs/
   ```

4. Test IAM permissions:
   ```bash
   aws sts get-caller-identity
   aws logs describe-log-groups --log-group-name-prefix /aws/ec2/game-review-server
   ```