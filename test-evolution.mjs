import axios from 'axios';

const apiToken = '8l4G4w9KFflc0Q61Vfl4jSFFQsSjR2aD';
const baseUrl = 'https://callapi.ranoverchat.com.br';

async function testEvolution() {
  const httpClient = axios.create({
    baseURL: baseUrl,
    headers: {
      apikey: apiToken,
      'Content-Type': 'application/json',
    },
  });

  try {
    console.log("Fetching instances...");
    const response = await httpClient.get('/instance/fetchInstances');
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
  }
}

testEvolution();
