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
} from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  iconUrl?: string;
}

interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface AirdropRecipient {
  address: string;
  amount: string;
}

export function Dashboard() {
  const account = useCurrentAccount();
  const client = new IotaClient({
    url: getFullnodeUrl("testnet"),
  });
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // State for tokens and NFTs
  const [tokens, setTokens] = useState<Token[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
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
      fetchUserNFTs();
    }
  }, [account?.address]);

  const fetchUserTokens = async () => {
    setIsLoading(true);
    setError(null);
    // try {
    //     const tx = new Transaction();
    //     tx.moveCall({
    //         target
    //     })
    // } catch (err) {
    //   console.error("Error fetching tokens:", err);
    // }
    try {
      if (account) {
        client
          .getOwnedObjects({
            owner: account.address,
            // filter: {
            //   StructType: `${packageId}::independent_ticketing_system_nft::TicketNFT`,
            // },
            options: {
              showType: true,
              showContent: true,
              showDisplay: true,
            },
          })
          // handle next page if neccessary
          .then(async (res) => {
            const objects = res.data;
            console.log(objects);
            console.log("objects");
            // console.log(
            //   objects.filter((obj) => {
            //     return (
            //       obj.data?.type?.startsWith(
            //         "0x2::coin_manager::CoinManagerTreasuryCap",
            //       ) || obj.data?.type?.startsWith("0x2::coin::Coin")
            //     );
            //   }),
            // );
            const treasury_cap_objects = objects.filter((obj) => {
              return obj.data?.type?.startsWith(
                "0x2::coin_manager::CoinManagerTreasuryCap",
              );
            });

            const token_metadata_objects = await Promise.all(
              treasury_cap_objects.map(async (obj) => {
                console.log(obj.data!.type!.split("<")[1].slice(0, -1));
                return client.getCoinMetadata({
                  coinType: obj.data!.type!.split("<")[1].slice(0, -1),
                });
              }),
            );
            console.log(token_metadata_objects);
          });
        //   .then((res) => {
        //     console.log(res);
        //   });
      }
      // Replace with your actual API endpoint
      const response = await fetch(
        `http://localhost:3000/user-tokens?address=${account?.address}`,
      );
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError("Failed to load your tokens. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserNFTs = async () => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(
        `http://localhost:3000/user-nfts?address=${account?.address}`,
      );
      const data = await response.json();
      setNfts(data.nfts || []);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      // We already set the error in fetchUserTokens if needed
    }
  };

  const handleMintTokens = async () => {
    if (
      !selectedToken ||
      !account?.address ||
      !mintAmount ||
      parseInt(mintAmount) <= 0
    ) {
      setError("Please select a token and enter a valid amount to mint");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tx = new Transaction();

      // Call the mint function on the token
      tx.moveCall({
        target: `${selectedToken.id}::token::mint`,
        arguments: [tx.pure.u64(mintAmount), tx.pure.address(account.address)],
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
                  `Successfully minted ${mintAmount} ${selectedToken.symbol} tokens`,
                );
                setMintAmount("");
                fetchUserTokens(); // Refresh token list
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
    if (!selectedToken || !burnAmount || parseInt(burnAmount) <= 0) {
      setError("Please select a token and enter a valid amount to burn");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tx = new Transaction();

      // Call the burn function on the token
      tx.moveCall({
        target: `${selectedToken.id}::token::burn`,
        arguments: [tx.pure.u64(burnAmount)],
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
                  `Successfully burned ${burnAmount} ${selectedToken.symbol} tokens`,
                );
                setBurnAmount("");
                fetchUserTokens(); // Refresh token list
              });
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
      (r) => !r.address || !r.amount || parseInt(r.amount) <= 0,
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

      // For each recipient, call the transfer function
      airdropRecipients.forEach((recipient) => {
        tx.moveCall({
          target: `${selectedToken.id}::token::transfer`,
          arguments: [
            tx.pure.u64(recipient.amount),
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
                  (sum, r) => sum + parseInt(r.amount || "0"),
                  0,
                );
                setSuccessMessage(
                  `Successfully airdropped ${totalAmount} ${selectedToken.symbol} tokens to ${airdropRecipients.length} recipients`,
                );
                setAirdropRecipients([{ address: "", amount: "" }]);
                fetchUserTokens(); // Refresh token list
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
                          <Table.Cell>{token.balance}</Table.Cell>
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
                                            {selectedToken?.balance}{" "}
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
                                            {selectedToken?.balance}{" "}
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
                <Heading size="4">Your NFTs</Heading>

                {isLoading ? (
                  <Flex justify="center" p="4">
                    <Text>Loading your NFTs...</Text>
                  </Flex>
                ) : nfts.length === 0 ? (
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
                    {nfts.map((nft) => (
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
                            <Button size="1" variant="soft">
                              View
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
                    onClick={fetchUserNFTs}
                    disabled={isLoading}
                  >
                    Refresh NFTs
                  </Button>
                </Box>
              </Flex>
            </Card>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  );
}
