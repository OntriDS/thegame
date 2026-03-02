require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

async function run() {
    const keys = await redis.smembers('index:tasks:collected:03-26');
    console.log('KEYS', keys);
    if (keys.length > 0) {
        const task = await redis.get('data:task:' + keys[0]);
        console.log('TASK 0', JSON.stringify(task, null, 2));
    }
}
run();
