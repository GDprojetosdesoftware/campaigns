import axios from 'axios';

const apiToken = 'hC1h9R9Q6vXq5Xy6uM5F7B1P';
const baseUrl = 'https://crm.ranoverchat.com.br';
const accountId = 2;
const filters = ['teste'];

async function testFilter() {
  const httpClient = axios.create({
    baseURL: baseUrl,
    headers: {
      api_access_token: apiToken,
      'Content-Type': 'application/json',
    },
  });

  try {
    const payload = [
      {
        attribute_key: 'labels',
        filter_operator: 'equal_to',
        values: filters,
        query_operator: 'and' // Chatwoot API often requires this field to be present or specific format
      }
    ];

    console.log("Sending payload:", JSON.stringify({ payload }, null, 2));
    const response = await httpClient.post(
      `/api/v1/accounts/${accountId}/contacts/filter`,
      { payload }
    );
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
  }
}

testFilter();
