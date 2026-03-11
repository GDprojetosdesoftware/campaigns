
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const CHATWOOT_URL = process.env.CHATWOOT_URL;
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;

async function testFilter() {
    try {
        const url = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/filter`;
        
        // Try with attribute_key: "labels"
        const payload1 = {
            payload: [
                {
                    attribute_key: "labels",
                    filter_operator: "equal_to",
                    values: ["cliente"], // Assuming 'cliente' is a common label
                    query_operator: "and",
                }
            ]
        };

        console.log('Testing Payload 1 (labels)...');
        const resp1 = await axios.post(url, payload1, {
            headers: { 'api_access_token': CHATWOOT_TOKEN }
        });
        console.log('Payload 1 result length:', resp1.data.payload.length);
        if (resp1.data.payload.length > 0) {
            console.log('First contact labels:', resp1.data.payload[0].labels);
        }

    } catch (error: any) {
        console.error('Error detail:', error.response?.data || error.message);
    }
}

testFilter();

