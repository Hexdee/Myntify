import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { useCurrentAccount } from "@iota/dapp-kit";
import { useState, useEffect, useCallback } from "react";

interface CoinMetadata {
  id: string;
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl?: string;
}

interface CoinData {
  id: string;
  type: string;
  balance: string;
  metadata: CoinMetadata | null;
  isRegulated: boolean;
  isManagedByCoinManager: boolean;
  maxSupply?: string;
  totalSupply?: string;
}

/**
 * Fetches all coins owned by an address and their metadata
 * @param address The address to fetch coins for
 * @returns An array of coin data with metadata
 */
export async function fetchUserCoins(address: string) {
  // : Promise<CoinData[]> {
  try {
    // Initialize the IOTA client
    const client = new IotaClient({
      url: getFullnodeUrl("testnet"),
    });

    // Fetch all objects owned by the address
    const ownedObjects = await client.getAllCoins({
      owner: address,
    });

    console.log("Owned Objects:", ownedObjects);

    // if (!ownedObjects.data || !ownedObjects.data.length) {
    //   return [];
    // }

    // // Filter for coin objects
    // // Coins have a type that matches the pattern *::coin::Coin<*>
    // const coinObjects = ownedObjects.data.filter((obj) => {
    //   const type = obj.data?.type;
    //   return type && typeof type === "string" && type.includes("::coin::Coin<");
    // });

    // // For each coin, fetch its metadata
    // // const coinsWithMetadata: CoinData[] = await Promise.all(
    // //   coinObjects.map(async (coinObj) => {
    // //     const coinId = coinObj.data?.objectId;
    // //     const coinType = coinObj.data?.type;
    // //     const coinBalance = coinObj.data?.content?.fields?.balance;

    // //     if (!coinId || !coinType) {
    // //       return {
    // //         id: coinObj.data?.objectId || "unknown",
    // //         type: coinObj.data?.type || "unknown",
    // //         balance: "0",
    // //         metadata: null,
    // //         isRegulated: false,
    // //         isManagedByCoinManager: false,
    // //       };
    // //     }

    // //     // Extract the coin type parameter (T in Coin<T>)
    // //     const typeMatch = coinType.match(/::coin::Coin<(.+)>/);
    // //     const coinTypeParam = typeMatch ? typeMatch[1] : null;

    // //     if (!coinTypeParam) {
    // //       return {
    // //         id: coinId,
    // //         type: coinType,
    // //         balance: coinBalance || "0",
    // //         metadata: null,
    // //         isRegulated: false,
    // //         isManagedByCoinManager: false,
    // //       };
    // //     }

    // //     // Check if there's a CoinManager for this coin type
    // //     // We query for shared objects of type coin_manager::CoinManager<T>
    // //     const coinManagerQuery = await client.multiGetObjects({
    // //       query: {
    // //         objectType: `0x02::coin_manager::CoinManager<${coinTypeParam}>`,
    // //       },
    // //       options: {
    // //         showContent: true,
    // //       },
    // //     });

    // //     let metadata: CoinMetadata | null = null;
    // //     let isRegulated = false;
    // //     let isManagedByCoinManager = false;
    // //     let maxSupply: string | undefined;
    // //     let totalSupply: string | undefined;

    // //     // If we found a CoinManager, use it to get metadata and supply info
    // //     if (coinManagerQuery.data && coinManagerQuery.data.length > 0) {
    // //       isManagedByCoinManager = true;
    // //       const coinManager = coinManagerQuery.data[0];

    // //       // Extract metadata from CoinManager
    // //       if (coinManager.data?.content?.fields?.metadata) {
    // //         const metadataFields =
    // //           coinManager.data.content.fields.metadata.fields;
    // //         metadata = {
    // //           id: coinManager.data.objectId,
    // //           decimals: parseInt(metadataFields.decimals || "0"),
    // //           name: metadataFields.name,
    // //           symbol: metadataFields.symbol,
    // //           description: metadataFields.description || "",
    // //           iconUrl: metadataFields.icon_url || undefined,
    // //         };
    // //       }

    // //       // Extract supply information
    // //       if (coinManager.data?.content?.fields?.supply) {
    // //         const supplyFields = coinManager.data.content.fields.supply.fields;
    // //         totalSupply = supplyFields.total_supply;

    // //         if (
    // //           supplyFields.maximum_supply &&
    // //           supplyFields.maximum_supply !== "0"
    // //         ) {
    // //           maxSupply = supplyFields.maximum_supply;
    // //         }
    // //       }
    // //     } else {
    // //       // If no CoinManager, try to find the CoinMetadata directly
    // //       // First, check if it's a regulated coin
    // //       const regulatedMetadataQuery = await client.getObjects({
    // //         query: {
    // //           objectType: `iota::coin::RegulatedCoinMetadata<${coinTypeParam}>`,
    // //         },
    // //         options: {
    // //           showContent: true,
    // //         },
    // //       });

    // //       if (
    // //         regulatedMetadataQuery.data &&
    // //         regulatedMetadataQuery.data.length > 0
    // //       ) {
    // //         isRegulated = true;
    // //         const regulatedMetadata = regulatedMetadataQuery.data[0];

    // //         // Get the underlying CoinMetadata object ID
    // //         const coinMetadataId =
    // //           regulatedMetadata.data?.content?.fields?.coin_metadata_object;

    // //       //   if (coinMetadataId) {
    // //       //     // Fetch the CoinMetadata object
    // //       //     const coinMetadataObj = await client.getObject({
    // //       //       id: coinMetadataId,
    // //       //       options: {
    // //       //         showContent: true,
    // //       //       },
    // //       //     });

    // //       //     if (coinMetadataObj.data?.content?.fields) {
    // //       //       const metadataFields = coinMetadataObj.data.content.fields;
    // //       //       metadata = {
    // //       //         id: coinMetadataId,
    // //       //         decimals: parseInt(metadataFields.decimals || "0"),
    // //       //         name: metadataFields.name,
    // //       //         symbol: metadataFields.symbol,
    // //       //         description: metadataFields.description || "",
    // //       //         iconUrl: metadataFields.icon_url || undefined,
    // //       //       };
    // //       //     }
    // //       //   }
    // //       // } else {
    // //       //   // Regular non-regulated coin, fetch CoinMetadata directly
    // //       //   const coinMetadataQuery = await client.getObjects({
    // //       //     query: {
    // //       //       objectType: `iota::coin::CoinMetadata<${coinTypeParam}>`,
    // //       //     },
    // //       //     options: {
    // //       //       showContent: true,
    // //       //     },
    // //       //   });

    // //       //   if (coinMetadataQuery.data && coinMetadataQuery.data.length > 0) {
    // //       //     const coinMetadataObj = coinMetadataQuery.data[0];

    // //       //     if (coinMetadataObj.data?.content?.fields) {
    // //       //       const metadataFields = coinMetadataObj.data.content.fields;
    // //       //       metadata = {
    // //       //         id: coinMetadataObj.data.objectId,
    // //       //         decimals: parseInt(metadataFields.decimals || "0"),
    // //       //         name: metadataFields.name,
    // //       //         symbol: metadataFields.symbol,
    // //       //         description: metadataFields.description || "",
    // //       //         iconUrl: metadataFields.icon_url || undefined,
    // //       //       };
    // //       //     }
    // //       //   }
    // //       // }
    // //     }

    // //     return {
    // //       id: coinId,
    // //       type: coinType,
    // //       balance: coinBalance || "0",
    // //       metadata,
    // //       isRegulated,
    // //       isManagedByCoinManager,
    // //       maxSupply,
    // //       totalSupply,
    // //     };
    // //   }),
    // // );

    // return coinsWithMetadata;
  } catch (error) {
    console.error("Error fetching user coins:", error);
    throw error;
  }
}

/**
 * React hook to fetch coins for the current account
 * @returns Object containing coins, loading state, error, and refresh function
 */
export function useUserCoins() {
  const account = useCurrentAccount();
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    if (!account?.address) {
      setCoins([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userCoins = await fetchUserCoins(account.address);
      setCoins(userCoins ?? []);
    } catch (err) {
      console.error("Error in useUserCoins:", err);
      setError(
        `Failed to fetch coins: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  return { coins, isLoading, error, refresh: fetchCoins };
}
