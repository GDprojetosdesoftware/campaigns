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
    console.log("--- Fetching Contacts (Page 1) ---");
    const response = await httpClient.get(`/api/v1/accounts/${accountId}/contacts`);
    const contacts = response.data.payload;
    console.log(`Found ${contacts.length} contacts.`);

    if (contacts.length > 0) {
        console.log("Labels found on first 5 contacts:");
        contacts.slice(0, 5).forEach(c => {
            console.log(`- ${c.name}: [${c.labels?.join(', ') || ''}]`);
        });
    }

    const allLabels = new Set();
    contacts.forEach(c => c.labels?.forEach(l => allLabels.add(l)));
    console.log("\nUnique labels found in these contacts:", Array.from(allLabels));

  } catch (error) {
    if (error.response) {
        console.error("Error status:", error.response.status);
        console.error("Error data:", JSON.stringify(error.response.data, null, 2));
    } else {
        console.error("Error:", error.message);
    }
  }
}

debugChatwoot();
