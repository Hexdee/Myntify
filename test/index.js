import { IotaClient, getFullnodeUrl } from '@iota/iota-sdk/client';

async function getTreasuryCapsWithMetadata(ownerAddress) {
  const rpcUrl = getFullnodeUrl('testnet');

  const client = new IotaClient({ url: rpcUrl });

  try {
    // Step 1: Retrieve all objects owned by the address
    const ownedObjects = await client.getOwnedObjects({
      owner: ownerAddress,
      options: { showContent: true, showTypes: true },
    });

    // console.log(
    //   'Owned objects types:',
    //   ownedObjects.data.map((obj) => {
    //     return { id: obj.data.objectId, type: obj.data.content.type };
    //   })
    // );

    // Step 2: Filter for TreasuryCap objects
    const treasuryCaps = ownedObjects.data.filter((obj) =>
      obj.data.content.type.includes('::Coin')
    );

    console.log('TreasuryCap objects:', treasuryCaps);

    // Step 3: For each TreasuryCap, retrieve metadata
    for (const cap of treasuryCaps) {
      console.log(`\nTreasuryCap Object ID: ${cap.data.objectId}`);
      try {
        const metadata = await client.getCoinMetadata({
          coinType: cap.data.content.type,
        });
        // const metadata = await client.callFunction({
        //   function: 'coin::read_metadata',
        //   arguments: [cap.id],
        // });
        console.log('Metadata:', metadata);
      } catch (metadataError) {
        console.error(
          `Failed to retrieve metadata for ${cap.id}:`,
          metadataError
        );
      }
    }
  } catch (error) {
    console.error('Error retrieving TreasuryCap objects:', error);
  }
}

// Replace with the actual owner's address
const ownerAddress =
  '0xa498c42069c001d4793f3315f894d8d7f8d560a7d6d9f34bff6b3528b830d0ff';
getTreasuryCapsWithMetadata(ownerAddress);
