const { BedrockClient } = require('@aws-sdk/client-bedrock');
require('dotenv').config();

const bedrock = new BedrockClient({
    region: 'us-east-1', // 실제 사용 중인 리전으로 변경
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

module.exports = bedrock;
