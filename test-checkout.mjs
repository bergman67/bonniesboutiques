import fetch from 'node-fetch';

async function test() {
  const payload = {
    items: [
      { id: '1', title: 'Keychain', price: 15.00, quantity: 1, imageUrl: '/keychain.png' }
    ],
    form: {
      firstName: 'Test', lastName: 'User', email: 'test@example.com',
      address: '123 Test St', city: 'Test City', state: 'TS', zip: '12345', country: 'US',
      paymentMethod: 'paypal'
    },
    total: 15.00
  };

  try {
    const res = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log('PayPal result:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
