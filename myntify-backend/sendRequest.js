fetch('http://localhost:3000/create-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Test Token',
    symbol: 'TST',
    description: 'A test token',
    decimals: 18,
    totalSupply: 1000,
    type: 'SIMPLE',
    icon: 'https://example.com/token-icon.png',
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error('Error:', error));
