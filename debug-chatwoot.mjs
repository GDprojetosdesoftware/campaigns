import axios from 'axios';

const apiToken = 'mEf6kBjkS93aRXYuvinhLCrd';
const baseUrl = 'https://crm.ranoverchat.com.br';
const accountId = 2;

async function debugChatwoot() {
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
    console.log("Labels:", labelsResponse.data.payload.map(l => l.title));

    const firstLabel = labelsResponse.data.payload[0]?.title;
    if (!firstLabel) {
      console.log("No labels found in Chatwoot.");
      return;
    }

    console.log(`\n--- Testing Filter with Label: ${firstLabel} ---`);
    // Testing the structure used in the backend
    const payload = [
      {
        attribute_key: 'labels',
        filter_operator: 'equal_to',
        values: [firstLabel],
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
    if (response.data.payload?.length > 0) {
        console.log("First contact name:", response.data.payload[0].name);
    }

  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
  }
}

debugChatwoot();
