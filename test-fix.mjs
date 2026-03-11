import axios from 'axios';

const apiToken = 'mEf6kBjkS93aRXYuvinhLCrd';
const baseUrl = 'https://crm.ranoverchat.com.br';
const accountId = 2;

async function testFix() {
  const httpClient = axios.create({
    baseURL: baseUrl,
    headers: {
      api_access_token: apiToken,
      'Content-Type': 'application/json',
    },
  });

  try {
    console.log("--- Fetching Labels ---");
    const labelsResponse = await httpClient.get(`/api/v1/accounts/${accountId}/labels`);
    const labels = labelsResponse.data.payload.map(l => l.title);
    console.log("Labels:", labels);

    const testLabel = labels[0];
    if (!testLabel) {
      console.log("No labels found in Chatwoot.");
      return;
    }

    console.log(`\n--- Testing NEW Filter with Label: ${testLabel} ---`);
    const payload = [
      {
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: [testLabel],
        attribute_model: 'standard',
        query_operator: null
      }
    ];

    console.log("Sending payload:", JSON.stringify({ payload }, null, 2));
    const response = await httpClient.post(
      `/api/v1/accounts/${accountId}/contacts/filter`,
      { payload }
    );
    console.log("Response status:", response.status);
    console.log("Contacts found:", response.data.payload?.length || 0);

  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
  }
}

testFix();
