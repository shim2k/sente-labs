#!/bin/bash

echo "Setting up CloudWatch Logs for game-review-server..."

# Update packages
sudo apt-get update -y

# Download and install CloudWatch Logs agent
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Copy the configuration file (you'll need to upload cloudwatch-config.json to the server first)
# sudo cp /home/ubuntu/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Start the CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/home/ubuntu/cloudwatch-config.json \
    -s

# Enable CloudWatch agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent

# Check agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -m ec2 \
    -a query

echo "CloudWatch Logs setup complete!"
echo "Remember to:"
echo "1. Attach an IAM role with CloudWatch Logs permissions to your EC2 instance"
echo "2. Upload cloudwatch-config.json to /home/ubuntu/ on the EC2 instance"
echo "3. Check the AWS CloudWatch console for your logs"