console.log('Sending request to create NFT...');
fetch('http://localhost:3000/create-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My unique arts',
    symbol: 'MUA',
    description: 'Unique, beautiful and rare NFTs',
    type: 'NFT',
    icon: 'https://example.com/token-icon.png',
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error('Error:', error));
