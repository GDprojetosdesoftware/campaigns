
import axios from 'axios';

const accountId = 2;
const token = 'mEf6kBjkS93aRXYuvinhLCrd';
const baseUrl = 'https://crm.ranoverchat.com.br';

async function listLabels() {
  try {
    const response = await axios.get(`${baseUrl}/api/v1/accounts/${accountId}/labels`, {
      headers: { api_access_token: token }
    });
    console.log('Labels found:', JSON.stringify(response.data.payload.map(l => l.title)));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

listLabels();
