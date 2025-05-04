import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Tabs,
  Card,
  Avatar,
  Grid,
  TextField,
  Dialog,
  ScrollArea,
  Table,
  Badge,
  TextArea,
} from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { formatValue } from "../utils";

interface Token {
  id?: string;
  name: string;
  description?: string;
  symbol: string;
  balance: number;
  decimals: number;
  iconUrl?: string | null;
  totalSupply: number;
  coinType: string;
  treasuryCap: string;
}

interface AirdropRecipient {
  address: string;
  amount: string;
}

interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner?: string;
  newDescription?: string;
}

interface NFTCollection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  nfts: NFT[];
}

export function Dashboard() {
  const account = useCurrentAccount();
  const client = new IotaClient({
    url: getFullnodeUrl("testnet"),
  });
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // State for tokens and NFTs
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for token actions
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [airdropRecipients, setAirdropRecipients] = useState<
    AirdropRecipient[]
  >([{ address: "", amount: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user's tokens and NFTs
  useEffect(() => {
    if (account?.address) {
      fetchUserTokens();
      fetchNFTCollections();
    }
  }, [account?.address]);

  const fetchUserTokens = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (account) {
        const ownedObjects = (
          await client.getOwnedObjects({
            owner: account.address,
            options: {
              showContent: true,
              showType: true,
            },
          })
        ).data;
        const coins = await client.getAllBalances({
          owner: account.address,
        });

        const coinsObjects: {
          [coinType: string]: Token;
        } = {};

        await Promise.all(
          coins.map(async (coin) => {
            try {
              const totalSupply = await client.getTotalSupply({
                coinType: coin.coinType,
              });
              const metadata = await client.getCoinMetadata({
                coinType: coin.coinType,
              });
              if (!metadata) {
                return;
              }
              const treasuryCap = ownedObjects.find(
                (obj) =>
                  obj.data?.type?.startsWith("0x2::coin::TreasuryCap<") &&
                  obj.data?.type?.includes(coin.coinType),
              );
              if (!treasuryCap?.data) {
                console.warn(`TreasuryCap not found for ${coin.coinType}`);
                return;
              }
              coinsObjects[coin.coinType] = {
                id: metadata.id ?? undefined,
                name: metadata.name,
                symbol: metadata.symbol,
                balance: Number.parseFloat(coin.totalBalance),
                decimals: metadata.decimals,
                iconUrl: metadata.iconUrl,
                description: metadata.description,
                totalSupply: Number.parseFloat(totalSupply.value),
                coinType: coin.coinType,
                treasuryCap: treasuryCap.data.objectId,
              };
            } catch (err) {
              if (err instanceof Error) {
                console.error();
              }
            }
          }),
        );

        setTokens(Object.values(coinsObjects));
      }
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError("Failed to load your tokens. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintTokens = async () => {
    if (
      !selectedToken ||
      !account?.address ||
      !mintAmount ||
      parseFloat(mintAmount) <= 0
    ) {
      setError("Please select a token and enter a valid amount to mint");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `0x2::coin::mint_and_transfer`,
        typeArguments: [selectedToken.coinType],
        arguments: [
          tx.object(selectedToken.treasuryCap),
          tx.pure.u64(Number(mintAmount) * 10 ** selectedToken.decimals),
          tx.pure.address(account.address),
        ],
      });
      tx.transferObjects(
        [tx.object(selectedToken.treasuryCap)],
        account.address,
      );

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                setSuccessMessage(
                  `Successfully minted ${mintAmount} ${selectedToken.symbol} tokens`,
                );
                setMintAmount("");
                fetchUserTokens();
              });
          },
          onError: (error: Error) => {
            console.error("Failed to mint tokens", error);
            setError(`Error minting tokens: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Mint error:", err);
      setError(
        `Failed to mint tokens: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBurnTokens = async () => {
    if (
      !selectedToken ||
      !account?.address ||
      !burnAmount ||
      parseFloat(burnAmount) <= 0
    ) {
      setError("Please select a token and enter a valid amount to burn");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tx = new Transaction();

      // Step 1: Split the coin to get an exact amount to burn
      const [coinToBurn] = tx.moveCall({
        target: "0x2::coin::split",
        typeArguments: [selectedToken.coinType],
        arguments: [
          tx.object(selectedToken.id!),
          tx.pure.u64(Number(burnAmount) * 10 ** selectedToken.decimals),
        ],
      });

      tx.transferObjects([coinToBurn], account.address);

      // // Step 2: Call the burn<T> function
      tx.moveCall({
        target: "0x2::coin::burn",
        typeArguments: [selectedToken.coinType],
        arguments: [tx.object(selectedToken.treasuryCap), coinToBurn],
      });

      tx.transferObjects(
        [tx.object(selectedToken.treasuryCap)],
        account.address,
      );

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: async ({ digest }: { digest: string }) => {
            await client.waitForTransaction({ digest });
            setSuccessMessage(
              `Successfully burned ${burnAmount} ${selectedToken.symbol} tokens`,
            );
            setBurnAmount("");
            fetchUserTokens(); // Refresh balance
          },
          onError: (error: Error) => {
            console.error("Failed to burn tokens", error);
            setError(`Error burning tokens: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Burn error:", err);
      setError(
        `Failed to burn tokens: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAirdropRecipient = () => {
    setAirdropRecipients([...airdropRecipients, { address: "", amount: "" }]);
  };

  const removeAirdropRecipient = (index: number) => {
    const updatedRecipients = [...airdropRecipients];
    updatedRecipients.splice(index, 1);
    setAirdropRecipients(updatedRecipients);
  };

  const updateAirdropRecipient = (
    index: number,
    field: "address" | "amount",
    value: string,
  ) => {
    const updatedRecipients = [...airdropRecipients];
    updatedRecipients[index][field] = value;
    setAirdropRecipients(updatedRecipients);
  };

  const handleAirdropTokens = async () => {
    if (!selectedToken) {
      setError("Please select a token for airdrop");
      return;
    }

    // Validate recipients
    const invalidRecipients = airdropRecipients.filter(
      (r) => !r.address || !r.amount || parseFloat(r.amount) <= 0,
    );

    if (invalidRecipients.length > 0) {
      setError("Please provide valid addresses and amounts for all recipients");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tx = new Transaction();
      console.log(airdropRecipients);

      // For each recipient, call the transfer function
      airdropRecipients.forEach((recipient) => {
        tx.moveCall({
          target: `0x2::coin::mint_and_transfer`,
          typeArguments: [selectedToken.coinType],
          arguments: [
            tx.object(selectedToken.treasuryCap),
            tx.pure.u64(
              Number(recipient.amount) * 10 ** selectedToken.decimals,
            ),
            tx.pure.address(recipient.address),
          ],
        });
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                const totalAmount = airdropRecipients.reduce(
                  (sum, r) => sum + parseFloat(r.amount || "0"),
                  0,
                );
                setSuccessMessage(
                  `Successfully airdropped ${totalAmount} ${selectedToken.symbol} tokens to ${airdropRecipients.length} recipients`,
                );
                setAirdropRecipients([{ address: "", amount: "" }]);
                fetchUserTokens();
              });
          },
          onError: (error: Error) => {
            console.error("Failed to airdrop tokens", error);
            setError(`Error airdropping tokens: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Airdrop error:", err);
      setError(
        `Failed to airdrop tokens: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /** NFT states and functions*/
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  // const [selectedCollection, setSelectedCollection] =
  //   useState<NFTCollection | null>(null);
  const [mintNFTData, setMintNFTData] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [transferAddress, setTransferAddress] = useState("");
  const [isNFTDialogOpen, setIsNFTDialogOpen] = useState(false);
  const [activeNFTTab, setActiveNFTTab] = useState("view");

  // Add this function to fetch NFT collections
  const fetchNFTCollections = async () => {
    try {
      if (account) {
        setIsLoading(true);

        // Get all objects owned by the user
        const ownedObjects = (
          await client.getOwnedObjects({
            owner: account.address,
            options: {
              showContent: true,
              showType: true,
            },
          })
        ).data;

        // Filter for MY_UNIQUE_ARTS NFTs
        const myNFTs = ownedObjects.filter((obj) =>
          obj.data?.type?.includes(
            "nft_my_unique_arts::my_unique_arts::MY_UNIQUE_ARTS",
          ),
        );

        // Transform the data
        // const nfts = myNFTs
        //   .filter((obj) => obj.data !== null && obj.data !== undefined)
        //   .map((obj) => {
        //     const content = obj.data!.content;
        //     return {
        //       id: obj.data!.objectId,
        //       name: obj.data?.fields!.name,
        //       description: content.fields.description,
        //       imageUrl: content.fields.url.fields.url,
        //       owner: account.address,
        //     };
        //   });
        console.log(myNFTs);

        const nfts = [
          {
            id: "1",
            name: "My NFT",
            description: "This is my NFT",
            imageUrl: "https://example.com/nft-image.png",
            owner: account.address,
          },
        ];

        // For simplicity, we'll put all NFTs in one collection
        // In a real app, you might have multiple collections
        const collection: NFTCollection = {
          id: "my-unique-arts",
          name: "My Unique Arts",
          description: "A collection of unique digital art NFTs",
          imageUrl: "https://example.com/nft-collection-image.png",
          nfts: nfts,
        };

        setNftCollections([collection]);
      }
    } catch (err) {
      console.error("Error fetching NFT collections:", err);
      setError("Failed to load your NFT collections. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to mint a new NFT
  const handleMintNFT = async () => {
    if (!account?.address || !mintNFTData.name || !mintNFTData.imageUrl) {
      setError("Please provide a name and image URL for your NFT");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const packageId = "0x1";
      const tx = new Transaction();

      // Set a reasonable gas budget
      tx.setGasBudget(9000000000);

      // Call the mint_to_sender function
      tx.moveCall({
        target: `${packageId}::my_unique_arts::mint_to_sender`,
        arguments: [
          tx.pure.string(mintNFTData.name),
          tx.pure.string(mintNFTData.description || ""),
          tx.pure.string(mintNFTData.imageUrl),
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                setSuccessMessage(
                  `Successfully minted NFT: ${mintNFTData.name}`,
                );
                setMintNFTData({ name: "", description: "", imageUrl: "" });
                fetchNFTCollections(); // Refresh NFT list
                setActiveNFTTab("view");
              });
          },
          onError: (error: Error) => {
            console.error("Failed to mint NFT", error);
            setError(`Error minting NFT: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Mint NFT error:", err);
      setError(
        `Failed to mint NFT: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to burn an NFT
  const handleBurnNFT = async () => {
    if (!selectedNFT) {
      setError("Please select an NFT to burn");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const packageId = "0x1";
      const tx = new Transaction();

      // Set a reasonable gas budget
      tx.setGasBudget(9000000000);

      // Call the burn function
      tx.moveCall({
        target: `${packageId}::my_unique_arts::burn`,
        arguments: [tx.object(selectedNFT.id)],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                setSuccessMessage(
                  `Successfully burned NFT: ${selectedNFT.name}`,
                );
                setSelectedNFT(null);
                fetchNFTCollections(); // Refresh NFT list
                setIsNFTDialogOpen(false);
              });
          },
          onError: (error: Error) => {
            console.error("Failed to burn NFT", error);
            setError(`Error burning NFT: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Burn NFT error:", err);
      setError(
        `Failed to burn NFT: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to transfer an NFT
  const handleTransferNFT = async () => {
    if (!selectedNFT || !transferAddress) {
      setError("Please select an NFT and provide a recipient address");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const packageId = "0x1";
      const tx = new Transaction();

      // Set a reasonable gas budget
      tx.setGasBudget(9000000000);

      // Call the transfer function
      tx.moveCall({
        target: `${packageId}::my_unique_arts::transfer`,
        arguments: [
          tx.object(selectedNFT.id),
          tx.pure.address(transferAddress),
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                setSuccessMessage(
                  `Successfully transferred NFT: ${selectedNFT.name} to ${transferAddress}`,
                );
                setSelectedNFT(null);
                setTransferAddress("");
                fetchNFTCollections(); // Refresh NFT list
                setIsNFTDialogOpen(false);
              });
          },
          onError: (error: Error) => {
            console.error("Failed to transfer NFT", error);
            setError(`Error transferring NFT: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Transfer NFT error:", err);
      setError(
        `Failed to transfer NFT: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to update NFT description
  const handleUpdateNFTDescription = async (newDescription: string) => {
    if (!selectedNFT) {
      setError("Please select an NFT to update");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const packageId = "0x1";
      const tx = new Transaction();

      // Set a reasonable gas budget
      tx.setGasBudget(9000000000);

      // Call the update_description function
      tx.moveCall({
        target: `${packageId}::my_unique_arts::update_description`,
        arguments: [tx.object(selectedNFT.id), tx.pure.string(newDescription)],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: ({ digest }: { digest: string }) => {
            client
              .waitForTransaction({ digest, options: { showEffects: true } })
              .then(() => {
                setSuccessMessage(
                  `Successfully updated NFT description for: ${selectedNFT.name}`,
                );
                fetchNFTCollections(); // Refresh NFT list
              });
          },
          onError: (error: Error) => {
            console.error("Failed to update NFT description", error);
            setError(`Error updating NFT description: ${error.message}`);
          },
        },
      );
    } catch (err) {
      console.error("Update NFT description error:", err);
      setError(
        `Failed to update NFT description: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account?.address) {
    return (
      <Container mt="5">
        <Card size="3" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Flex direction="column" align="center" gap="4" p="4">
            <Avatar
              size="6"
              fallback="🔒"
              radius="full"
              style={{ background: "var(--violet-5)" }}
            />
            <Heading size="6" align="center">
              Connect Your Wallet
            </Heading>
            <Text align="center" size="3" color="gray">
              Please connect your wallet to view your tokens and NFTs
            </Text>
            <Button size="3" style={{ width: "100%", maxWidth: "300px" }}>
              Connect Wallet
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container mt="5" size="3">
      <Heading size="8" mb="4">
        My Dashboard
      </Heading>

      {error && (
        <Box
          mb="4"
          p="3"
          style={{ background: "var(--red-3)", borderRadius: "8px" }}
        >
          <Text color="red">{error}</Text>
        </Box>
      )}

      {successMessage && (
        <Box
          mb="4"
          p="3"
          style={{ background: "var(--green-3)", borderRadius: "8px" }}
        >
          <Text color="green">{successMessage}</Text>
        </Box>
      )}

      <Tabs.Root defaultValue="tokens">
        <Tabs.List>
          <Tabs.Trigger value="tokens">My Tokens</Tabs.Trigger>
          <Tabs.Trigger value="nfts">My NFTs</Tabs.Trigger>
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="tokens">
            <Card size="2">
              <Flex direction="column" gap="4">
                <Heading size="4">Your Tokens</Heading>

                {isLoading ? (
                  <Flex justify="center" p="4">
                    <Text>Loading your tokens...</Text>
                  </Flex>
                ) : tokens.length === 0 ? (
                  <Box
                    p="4"
                    style={{ background: "var(--gray-2)", borderRadius: "8px" }}
                  >
                    <Text align="center">
                      You don't have any tokens yet. Create your first token to
                      get started!
                    </Text>
                  </Box>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Token</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Symbol</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Supply</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {tokens.map((token) => (
                        <Table.Row key={token.id}>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              {token.iconUrl ? (
                                <img
                                  src={token.iconUrl}
                                  alt={token.name}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "12px",
                                  }}
                                />
                              ) : (
                                <Box
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "12px",
                                    background: "var(--gray-5)",
                                  }}
                                />
                              )}
                              <Text>{token.name}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>{token.symbol}</Table.Cell>
                          <Table.Cell>
                            {formatValue(token.totalSupply, token.decimals)}
                          </Table.Cell>
                          <Table.Cell>
                            {formatValue(token.balance, token.decimals)}
                          </Table.Cell>
                          <Table.Cell>
                            <Flex gap="2">
                              <Dialog.Root>
                                <Dialog.Trigger>
                                  <Button
                                    size="1"
                                    variant="soft"
                                    onClick={() => setSelectedToken(token)}
                                  >
                                    Manage
                                  </Button>
                                </Dialog.Trigger>
                                {selectedToken && (
                                  <Dialog.Content style={{ maxWidth: "500px" }}>
                                    <Dialog.Title>
                                      Manage {token.name}
                                    </Dialog.Title>
                                    <Dialog.Description size="2" mb="4">
                                      Mint, burn, or airdrop your tokens.
                                    </Dialog.Description>

                                    <Tabs.Root defaultValue="mint">
                                      <Tabs.List>
                                        <Tabs.Trigger value="mint">
                                          Mint
                                        </Tabs.Trigger>
                                        <Tabs.Trigger value="burn">
                                          Burn
                                        </Tabs.Trigger>
                                        <Tabs.Trigger value="airdrop">
                                          Airdrop
                                        </Tabs.Trigger>
                                      </Tabs.List>

                                      <Box pt="3">
                                        <Tabs.Content value="mint">
                                          <Flex direction="column" gap="3">
                                            <Text
                                              as="label"
                                              size="2"
                                              weight="bold"
                                            >
                                              Amount to Mint
                                            </Text>
                                            <TextField.Root
                                              type="number"
                                              value={mintAmount}
                                              onChange={(e) =>
                                                setMintAmount(e.target.value)
                                              }
                                              placeholder="Enter amount to mint"
                                            />
                                            <Button
                                              onClick={handleMintTokens}
                                              disabled={isSubmitting}
                                            >
                                              {isSubmitting
                                                ? "Processing..."
                                                : "Mint Tokens"}
                                            </Button>
                                          </Flex>
                                        </Tabs.Content>

                                        <Tabs.Content value="burn">
                                          <Flex direction="column" gap="3">
                                            <Text
                                              as="label"
                                              size="2"
                                              weight="bold"
                                            >
                                              Amount to Burn
                                            </Text>
                                            <TextField.Root
                                              type="number"
                                              value={burnAmount}
                                              onChange={(e) =>
                                                setBurnAmount(e.target.value)
                                              }
                                              placeholder="Enter amount to burn"
                                            />
                                            <Text size="1" color="gray">
                                              Current balance:{" "}
                                              {formatValue(
                                                selectedToken.balance,
                                                selectedToken.decimals,
                                              )}{" "}
                                              {selectedToken?.symbol}
                                            </Text>
                                            <Button
                                              onClick={handleBurnTokens}
                                              disabled={isSubmitting}
                                              color="red"
                                            >
                                              {isSubmitting
                                                ? "Processing..."
                                                : "Burn Tokens"}
                                            </Button>
                                          </Flex>
                                        </Tabs.Content>

                                        <Tabs.Content value="airdrop">
                                          <Flex direction="column" gap="3">
                                            <Text size="2" weight="bold">
                                              Airdrop Recipients
                                            </Text>

                                            <ScrollArea
                                              style={{ height: "200px" }}
                                            >
                                              {airdropRecipients.map(
                                                (recipient, index) => (
                                                  <Flex
                                                    key={index}
                                                    gap="2"
                                                    mb="2"
                                                    align="center"
                                                  >
                                                    <TextField.Root
                                                      placeholder="Recipient address"
                                                      value={recipient.address}
                                                      onChange={(e) =>
                                                        updateAirdropRecipient(
                                                          index,
                                                          "address",
                                                          e.target.value,
                                                        )
                                                      }
                                                      style={{ flex: 3 }}
                                                    />
                                                    <TextField.Root
                                                      type="number"
                                                      placeholder="Amount"
                                                      value={recipient.amount}
                                                      onChange={(e) =>
                                                        updateAirdropRecipient(
                                                          index,
                                                          "amount",
                                                          e.target.value,
                                                        )
                                                      }
                                                      style={{ flex: 1 }}
                                                    />
                                                    {airdropRecipients.length >
                                                      1 && (
                                                      <Button
                                                        variant="soft"
                                                        color="red"
                                                        size="1"
                                                        onClick={() =>
                                                          removeAirdropRecipient(
                                                            index,
                                                          )
                                                        }
                                                      >
                                                        ✕
                                                      </Button>
                                                    )}
                                                  </Flex>
                                                ),
                                              )}
                                            </ScrollArea>

                                            <Button
                                              variant="soft"
                                              onClick={addAirdropRecipient}
                                            >
                                              + Add Recipient
                                            </Button>

                                            <Text size="1" color="gray">
                                              Current balance:{" "}
                                              {formatValue(
                                                selectedToken.balance,
                                                selectedToken.decimals,
                                              )}{" "}
                                              {selectedToken?.symbol}
                                            </Text>

                                            <Button
                                              onClick={handleAirdropTokens}
                                              disabled={isSubmitting}
                                            >
                                              {isSubmitting
                                                ? "Processing..."
                                                : "Send Airdrop"}
                                            </Button>
                                          </Flex>
                                        </Tabs.Content>
                                      </Box>
                                    </Tabs.Root>

                                    <Flex gap="3" mt="4" justify="end">
                                      <Dialog.Close>
                                        <Button variant="soft" color="gray">
                                          Close
                                        </Button>
                                      </Dialog.Close>
                                    </Flex>
                                  </Dialog.Content>
                                )}
                              </Dialog.Root>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}

                <Box>
                  <Button
                    variant="soft"
                    onClick={fetchUserTokens}
                    disabled={isLoading}
                  >
                    Refresh Tokens
                  </Button>
                </Box>
              </Flex>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="nfts">
            <Card size="2">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Your NFTs</Heading>
                  <Button
                    variant="soft"
                    onClick={() => {
                      setActiveNFTTab("mint");
                      setIsNFTDialogOpen(true);
                    }}
                  >
                    Mint New NFT
                  </Button>
                </Flex>

                {isLoading ? (
                  <Flex justify="center" p="4">
                    <Text>Loading your NFTs...</Text>
                  </Flex>
                ) : nftCollections.length === 0 ? (
                  <Box
                    p="4"
                    style={{ background: "var(--gray-2)", borderRadius: "8px" }}
                  >
                    <Text align="center">
                      You don't have any NFTs yet. Create your first NFT to get
                      started!
                    </Text>
                  </Box>
                ) : (
                  <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
                    {nftCollections.map((nft) => (
                      <Card key={nft.id} size="1">
                        <Flex direction="column" gap="2">
                          <Box
                            style={{
                              position: "relative",
                              paddingBottom: "100%",
                            }}
                          >
                            <img
                              src={nft.imageUrl}
                              alt={nft.name}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://placehold.co/400x400?text=NFT";
                              }}
                            />
                          </Box>
                          <Heading size="3">{nft.name}</Heading>
                          <Text
                            size="1"
                            color="gray"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {nft.description}
                          </Text>
                          <Flex justify="between" align="center">
                            <Badge size="1" color="violet">
                              NFT
                            </Badge>
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => {
                                setSelectedNFT(nft);
                                setActiveNFTTab("view");
                                setIsNFTDialogOpen(true);
                              }}
                            >
                              Manage
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Grid>
                )}

                <Box>
                  <Button
                    variant="soft"
                    onClick={fetchNFTCollections}
                    disabled={isLoading}
                  >
                    Refresh NFTs
                  </Button>
                </Box>
              </Flex>
            </Card>

            {/* NFT Management Dialog */}
            <Dialog.Root
              open={isNFTDialogOpen}
              onOpenChange={setIsNFTDialogOpen}
            >
              <Dialog.Content style={{ maxWidth: "600px" }}>
                {activeNFTTab === "view" && selectedNFT ? (
                  <>
                    <Dialog.Title>Manage NFT: {selectedNFT.name}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                      View, transfer, or burn your NFT.
                    </Dialog.Description>

                    <Flex direction="column" gap="4">
                      <Box
                        style={{
                          position: "relative",
                          paddingBottom: "60%",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={selectedNFT.imageUrl}
                          alt={selectedNFT.name}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/400x400?text=NFT";
                          }}
                        />
                      </Box>

                      <Box>
                        <Heading size="3" mb="1">
                          {selectedNFT.name}
                        </Heading>
                        <Text size="2" color="gray" mb="3">
                          {selectedNFT.description}
                        </Text>
                        <Flex gap="2" wrap="wrap">
                          <Badge>ID: {selectedNFT.id.substring(0, 8)}...</Badge>
                          <Badge color="blue">
                            Owner: {account.address.substring(0, 8)}...
                          </Badge>
                        </Flex>
                      </Box>

                      <Tabs.Root defaultValue="details">
                        <Tabs.List>
                          <Tabs.Trigger value="details">Details</Tabs.Trigger>
                          <Tabs.Trigger value="transfer">Transfer</Tabs.Trigger>
                          <Tabs.Trigger value="update">Update</Tabs.Trigger>
                          <Tabs.Trigger value="burn">Burn</Tabs.Trigger>
                        </Tabs.List>

                        <Box pt="3">
                          <Tabs.Content value="details">
                            <Flex direction="column" gap="2">
                              <Text size="2" weight="bold">
                                NFT Details
                              </Text>
                              <Box
                                p="3"
                                style={{
                                  background: "var(--gray-2)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Flex direction="column" gap="2">
                                  <Flex justify="between">
                                    <Text size="2" color="gray">
                                      ID
                                    </Text>
                                    <Text size="2">{selectedNFT.id}</Text>
                                  </Flex>
                                  <Flex justify="between">
                                    <Text size="2" color="gray">
                                      Owner
                                    </Text>
                                    <Text size="2">{account.address}</Text>
                                  </Flex>
                                  <Flex justify="between">
                                    <Text size="2" color="gray">
                                      Image URL
                                    </Text>
                                    <Text
                                      size="2"
                                      style={{
                                        maxWidth: "250px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {selectedNFT.imageUrl}
                                    </Text>
                                  </Flex>
                                </Flex>
                              </Box>
                            </Flex>
                          </Tabs.Content>

                          <Tabs.Content value="transfer">
                            <Flex direction="column" gap="3">
                              <Text size="2" weight="bold">
                                Transfer NFT
                              </Text>
                              <Text size="2">
                                Enter the recipient's address to transfer this
                                NFT.
                              </Text>
                              <TextField.Root
                                placeholder="Recipient address"
                                value={transferAddress}
                                onChange={(e) =>
                                  setTransferAddress(e.target.value)
                                }
                              />
                              <Button
                                onClick={handleTransferNFT}
                                disabled={isSubmitting || !transferAddress}
                              >
                                {isSubmitting
                                  ? "Processing..."
                                  : "Transfer NFT"}
                              </Button>
                            </Flex>
                          </Tabs.Content>

                          <Tabs.Content value="update">
                            <Flex direction="column" gap="3">
                              <Text size="2" weight="bold">
                                Update Description
                              </Text>
                              <TextArea
                                placeholder="New description"
                                defaultValue={selectedNFT.description}
                                onChange={(e: {
                                  target: { value: string };
                                }) => {
                                  // Store the new description temporarily
                                  setSelectedNFT({
                                    ...selectedNFT,
                                    newDescription: e.target.value,
                                  });
                                }}
                              />
                              <Button
                                onClick={() =>
                                  handleUpdateNFTDescription(
                                    selectedNFT.newDescription ||
                                      selectedNFT.description,
                                  )
                                }
                                disabled={isSubmitting}
                              >
                                {isSubmitting
                                  ? "Processing..."
                                  : "Update Description"}
                              </Button>
                            </Flex>
                          </Tabs.Content>

                          <Tabs.Content value="burn">
                            <Flex direction="column" gap="3">
                              <Text size="2" weight="bold" color="red">
                                Burn NFT
                              </Text>
                              <Text size="2">
                                Warning: This action is irreversible. The NFT
                                will be permanently destroyed.
                              </Text>
                              <Box
                                p="3"
                                style={{
                                  background: "var(--red-3)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Text size="2" color="red">
                                  Are you sure you want to burn{" "}
                                  {selectedNFT.name}?
                                </Text>
                              </Box>
                              <Button
                                onClick={handleBurnNFT}
                                disabled={isSubmitting}
                                color="red"
                              >
                                {isSubmitting ? "Processing..." : "Burn NFT"}
                              </Button>
                            </Flex>
                          </Tabs.Content>
                        </Box>
                      </Tabs.Root>
                    </Flex>
                  </>
                ) : activeNFTTab === "mint" ? (
                  <>
                    <Dialog.Title>Mint New NFT</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                      Create a new unique digital art NFT.
                    </Dialog.Description>

                    <Flex direction="column" gap="4">
                      <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="bold">
                          NFT Name
                        </Text>
                        <TextField.Root
                          placeholder="Enter NFT name"
                          value={mintNFTData.name}
                          onChange={(e) =>
                            setMintNFTData({
                              ...mintNFTData,
                              name: e.target.value,
                            })
                          }
                        />
                      </Flex>

                      <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="bold">
                          Description
                        </Text>
                        <TextArea
                          placeholder="Enter NFT description"
                          value={mintNFTData.description}
                          onChange={(e: { target: { value: string } }) =>
                            setMintNFTData({
                              ...mintNFTData,
                              description: e.target.value,
                            })
                          }
                        />
                      </Flex>

                      <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="bold">
                          Image URL
                        </Text>
                        <TextField.Root
                          placeholder="Enter image URL"
                          value={mintNFTData.imageUrl}
                          onChange={(e) =>
                            setMintNFTData({
                              ...mintNFTData,
                              imageUrl: e.target.value,
                            })
                          }
                        />
                      </Flex>

                      {mintNFTData.imageUrl && (
                        <Box
                          style={{
                            position: "relative",
                            paddingBottom: "60%",
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={mintNFTData.imageUrl}
                            alt="NFT Preview"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/400x400?text=Preview";
                            }}
                          />
                        </Box>
                      )}

                      <Button
                        onClick={handleMintNFT}
                        disabled={
                          isSubmitting ||
                          !mintNFTData.name ||
                          !mintNFTData.imageUrl
                        }
                      >
                        {isSubmitting ? "Processing..." : "Mint NFT"}
                      </Button>
                    </Flex>
                  </>
                ) : null}

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">
                      Close
                    </Button>
                  </Dialog.Close>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  );
}
