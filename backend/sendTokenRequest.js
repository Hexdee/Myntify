console.log('Sending request to create token...');
fetch('http://146.190.94.23/create-token', {
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
  .then((response) => {
     console.log(response);
     response.json()
    .then((data) => console.log(data))
    .catch((error) => console.error('Error:', error));
  })
