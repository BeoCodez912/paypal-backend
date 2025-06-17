// server.js (CommonJS version)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API = 'https://api-m.paypal.com';

async function getAccessToken() {
  const credentials = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
  const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data.access_token;
}

app.post('/paypal-withdraw', async (req, res) => {
  const { email, amount } = req.body;
  if (!email || !amount || isNaN(amount)) return res.status(400).json({ success: false, message: 'Invalid input' });

  try {
    const accessToken = await getAccessToken();
    const batchId = `batch_${Date.now()}`;

    const payout = await axios.post(`${PAYPAL_API}/v1/payments/payouts`, {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'You have a payout!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount,
            currency: 'USD',
          },
          receiver: email,
          note: 'Thanks for using our PayPal Earnings App!',
          sender_item_id: `item_${Date.now()}`,
        },
      ],
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({ success: true, batchId, amount });
  } catch (err) {
    console.error('PayPal payout error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'PayPal payout failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
