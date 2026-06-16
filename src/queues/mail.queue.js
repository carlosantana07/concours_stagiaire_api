import { Queue } from 'bullmq';
import connection from "../config/redis.js";
const sendMailQueue = new Queue('send-mail',{
    connection,
});

export default sendMailQueue;