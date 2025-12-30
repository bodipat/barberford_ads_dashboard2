const json = process.env.GA4_SERVICE_ACCOUNT_JSON;
if (!json) {
  console.log('GA4_SERVICE_ACCOUNT_JSON is not set');
} else {
  try {
    const parsed = JSON.parse(json);
    console.log('Parsed successfully');
    console.log('client_email:', parsed.client_email);
    console.log('private_key starts with:', parsed.private_key?.substring(0, 50));
    console.log('private_key length:', parsed.private_key?.length);
    console.log('Has newlines:', parsed.private_key?.includes('\\n'));
  } catch (e) {
    console.log('Parse error:', e.message);
    console.log('Raw value (first 100 chars):', json.substring(0, 100));
  }
}
