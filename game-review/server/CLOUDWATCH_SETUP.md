# CloudWatch Logs Setup for Game Review Server

This guide will help you set up CloudWatch Logs to monitor your EC2 instance logs.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. EC2 instance running the game-review-server
3. IAM permissions to create roles and policies

## Setup Steps

### 1. Create IAM Role for EC2 Instance

First, create an IAM role that your EC2 instance can assume:

```bash
# Create the trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GameReviewCloudWatchLogsRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the policy
aws iam put-role-policy \
  --role-name GameReviewCloudWatchLogsRole \
  --policy-name CloudWatchLogsPolicy \
  --policy-document file://cloudwatch-logs-policy.json

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name GameReviewCloudWatchLogsProfile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name GameReviewCloudWatchLogsProfile \
  --role-name GameReviewCloudWatchLogsRole
```

### 2. Attach IAM Role to EC2 Instance

```bash
# Replace i-xxxxxxxxx with your instance ID
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxxxxxx \
  --iam-instance-profile Name=GameReviewCloudWatchLogsProfile
```

### 3. Upload Configuration Files to EC2

```bash
# Upload the CloudWatch config file
scp -i ~/.ssh/your-key.pem cloudwatch-config.json ubuntu@44.214.189.203:/home/ubuntu/

# Upload the setup script
scp -i ~/.ssh/your-key.pem setup-cloudwatch-logs.sh ubuntu@44.214.189.203:/home/ubuntu/
```

### 4. Run Setup Script on EC2

```bash
# SSH into the instance
ssh -i ~/.ssh/your-key.pem ubuntu@44.214.189.203

# Run the setup script
chmod +x setup-cloudwatch-logs.sh
./setup-cloudwatch-logs.sh
```

### 5. Verify Logs in CloudWatch Console

1. Go to AWS CloudWatch Console
2. Navigate to Logs → Log groups
3. Look for `/aws/ec2/game-review-server`
4. You should see log streams for:
   - combined logs
   - error logs
   - api-errors logs
   - app logs
   - syslog

## Viewing Logs

### Via AWS Console
1. Go to CloudWatch → Logs → Log groups
2. Click on `/aws/ec2/game-review-server`
3. Select a log stream to view logs

### Via AWS CLI
```bash
# Tail logs
aws logs tail /aws/ec2/game-review-server --follow

# Filter logs for specific patterns
aws logs tail /aws/ec2/game-review-server --filter-pattern '"Data quality assessment"'

# Get logs from last hour
aws logs tail /aws/ec2/game-review-server --since 1h
```

## Useful Filters

To find specific log entries, use these filter patterns in CloudWatch:

- Data quality assessments: `"Data quality assessment"`
- Errors: `[ERROR]`
- API errors: `"statusCode" "500"`
- Review generation: `"ReviewEngine"`
- Insufficient data: `"BASIC/LOBBY-ONLY"`

## Troubleshooting

If logs aren't appearing:

1. Check agent status:
   ```bash
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
     -m ec2 -a query
   ```

2. Check agent logs:
   ```bash
   sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
   ```

3. Verify IAM permissions:
   ```bash
   aws sts get-caller-identity
   ```

4. Ensure log files exist and are readable:
   ```bash
   ls -la /home/ubuntu/game-review/server/logs/
   ```