
import axios from 'axios';

const accountId = 2;
const token = 'mEf6kBjkS93aRXYuvinhLCrd';
const baseUrl = 'https://crm.ranoverchat.com.br';

async function testFilter(name, payload) {
  console.log(`--- Testing: ${name} ---`);
  try {
    const response = await axios.post(`${baseUrl}/api/v1/accounts/${accountId}/contacts/filter`, { payload }, {
      headers: { api_access_token: token }
    });
    console.log(`Status: ${response.status}`);
    const count = response.data.payload ? response.data.payload.length : (response.data.meta ? response.data.meta.count : 'N/A');
    console.log(`Contacts found: ${count}`);
    if (response.data.payload && response.data.payload.length > 0) {
        console.log(`First contact labels: ${JSON.stringify(response.data.payload[0].labels)}`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Response body: ${JSON.stringify(error.response.data)}`);
    }
  }
}

async function run() {
  // Try empty filter to see structure or all contacts
  await testFilter('All contacts (no payload)', []);

  // Try filtering by a common label if it exists
  await testFilter('Filter by labels (equal_to)', [
    {
      attribute_key: 'labels',
      filter_operator: 'equal_to',
      values: ['cliente'],
      attribute_model: 'standard'
    }
  ]);

  // Try filtering by labels (contains)
  await testFilter('Filter by labels (contains)', [
    {
      attribute_key: 'labels',
      filter_operator: 'contains',
      values: ['cliente'],
      attribute_model: 'standard'
    }
  ]);
}

run();
