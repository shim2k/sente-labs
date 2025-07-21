import { SQS } from 'aws-sdk';

let sqs: SQS;

function getSQS() {
  if (!sqs) {
    sqs = new SQS({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return sqs;
}

export async function sendSQSMessage(payload: {
  taskId: string;
  gameId: number;
  userId: string;
  notes?: string;
}) {
  const QUEUE_URL = process.env.SQS_QUEUE_URL;
  
  console.log('SQS_QUEUE_URL from env:', QUEUE_URL);
  console.log('SQS_QUEUE_URL length:', QUEUE_URL?.length);
  
  if (!QUEUE_URL) {
    throw new Error('SQS_QUEUE_URL not configured');
  }

  const params = {
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  };

  return getSQS().sendMessage(params).promise();
}