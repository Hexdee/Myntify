import { useState, useRef } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  TextField,
  Text,
  Card,
  Avatar,
  Tabs,
  Grid,
} from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

interface TokenFormData {
  name: string;
  symbol: string;
  supply: string;
  description: string;
  tokenType: "fungible" | "non-fungible";
  iconUrl: string;
}

export function TokenWizard() {
  const account = useCurrentAccount();
  const client = new IotaClient({
    url: getFullnodeUrl("testnet"),
  });

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    supply: "0",
    description: "",
    tokenType: "fungible",
    iconUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      tokenType: value as "fungible" | "non-fungible",
    }));
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "token_icons"); // Set your Cloudinary upload preset

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dltocubu4/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, iconUrl: data.secure_url }));
        setIsUploading(false);
      } else {
        throw new Error("Failed to get image URL");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setError(
        `Failed to upload image: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setTokenId(null);

    if (!client || !account) {
      setError("Client or account not available");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/create-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          decimals: 18,
          type: "SIMPLE",
          icon: formData.iconUrl,
          totalSupply: formData.supply,
        }),
      });
      const data = await res.json();
      // Create a new transaction
      const tx = new Transaction();

      if (formData.tokenType === "fungible") {
        const publishCall = tx.publish({
          dependencies: data.dependencies,
          modules: data.modules,
        });
        console.log(publishCall);
        tx.transferObjects([publishCall], account.address);

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
                  resetForm();
                  setSuccess(
                    `Token ${formData.name} (${formData.symbol}) created successfully!`,
                  );
                });
            },
            onError: (error: Error) => {
              console.error("Failed to execute transaction", tx, error);
              setIsSubmitting(false);
              setError(`Error Occurred: ${error.message}`);
            },
          },
        );
      } else {
        tx.moveCall({
          target: "0x2::devnet_nft::mint",
          arguments: [
            tx.pure.string(formData.name),
            tx.pure.string(formData.description),
            tx.pure.string(
              formData.iconUrl || "https://placekitten.com/200/300",
            ), // Use uploaded icon or placeholder
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
                .then((result) => {
                  const createdNftId =
                    result.effects?.created?.[0]?.reference?.objectId;
                  if (createdNftId) {
                    setTokenId(createdNftId);
                  }
                  resetForm();
                  setSuccess(`NFT ${formData.name} created successfully!`);
                });
            },
            onError: (error: Error) => {
              console.error("Failed to create NFT", error);
              setIsSubmitting(false);
              setError(`Error Occurred: ${error.message}`);
            },
          },
        );
      }
    } catch (err) {
      console.error("Token creation error:", err);
      setError(
        `Failed to create token: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      supply: "0",
      description: "",
      tokenType: "fungible",
      iconUrl: "",
    });
    setPreviewImage(null);
    setIsSubmitting(false);
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
              Please connect your wallet to create tokens on the IOTA network
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
      <Card size="3">
        <Flex direction="column" gap="5">
          <Flex justify="between" align="center">
            <Heading size="6">Create New Token</Heading>
            <Text size="2" color="gray">
              Connected: {account.address.slice(0, 6)}...
              {account.address.slice(-4)}
            </Text>
          </Flex>

          {error && (
            <Box
              mb="2"
              p="3"
              style={{ background: "var(--red-3)", borderRadius: "8px" }}
            >
              <Text color="red">{error}</Text>
            </Box>
          )}

          {success && (
            <Box
              mb="2"
              p="3"
              style={{ background: "var(--green-3)", borderRadius: "8px" }}
            >
              <Text color="green">{success}</Text>
              {tokenId && (
                <Text size="2" mt="2">
                  Token ID: {tokenId}
                </Text>
              )}
            </Box>
          )}

          <Tabs.Root defaultValue="fungible">
            <Tabs.List>
              <Tabs.Trigger
                value="fungible"
                onClick={() => handleSelectChange("fungible")}
              >
                Fungible Token
              </Tabs.Trigger>
              <Tabs.Trigger
                value="non-fungible"
                onClick={() => handleSelectChange("non-fungible")}
              >
                Non-Fungible Token (NFT)
              </Tabs.Trigger>
            </Tabs.List>

            <Box pt="4">
              <form onSubmit={handleSubmit}>
                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  <Box>
                    <Flex direction="column" gap="4">
                      <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                          Token Name
                        </Text>
                        <TextField.Root
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="My Awesome Token"
                          required
                        />
                      </Box>

                      <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                          Token Symbol
                        </Text>
                        <TextField.Root
                          name="symbol"
                          value={formData.symbol}
                          onChange={handleChange}
                          placeholder="MAT"
                          required
                        />
                      </Box>

                      <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                          Token Supply
                        </Text>
                        <TextField.Root
                          name="supply"
                          type="number"
                          value={formData.supply}
                          onChange={handleChange}
                          placeholder="1000000"
                          required
                        />
                      </Box>

                      <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                          Description
                        </Text>
                        <TextField.Root
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Describe your token"
                        />
                      </Box>
                    </Flex>
                  </Box>

                  <Box>
                    <Card size="2" style={{ height: "100%" }}>
                      <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        gap="4"
                        style={{ height: "100%" }}
                      >
                        <Text as="label" size="2" weight="bold">
                          Token Icon
                        </Text>

                        <Box
                          style={{
                            position: "relative",
                            width: "150px",
                            height: "150px",
                          }}
                        >
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Token Icon Preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "75px",
                                border: "2px dashed var(--gray-5)",
                              }}
                            />
                          ) : (
                            <Flex
                              align="center"
                              justify="center"
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "75px",
                                border: "2px dashed var(--gray-5)",
                                background: "var(--gray-2)",
                                cursor: "pointer",
                              }}
                              onClick={triggerFileInput}
                            >
                              <Text color="gray" align="center">
                                {isUploading
                                  ? "Uploading..."
                                  : "Click to upload icon"}
                              </Text>
                            </Flex>
                          )}

                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            accept="image/*"
                            onChange={handleIconUpload}
                          />
                        </Box>

                        <Button
                          type="button"
                          variant="soft"
                          disabled={isUploading}
                          onClick={triggerFileInput}
                        >
                          {isUploading
                            ? "Uploading..."
                            : previewImage
                              ? "Change Icon"
                              : "Upload Icon"}
                        </Button>

                        {formData.iconUrl && (
                          <Text size="1" color="gray">
                            Icon uploaded successfully
                          </Text>
                        )}
                      </Flex>
                    </Card>
                  </Box>
                </Grid>

                <Box mt="5">
                  <Card size="1">
                    <Flex gap="3" align="center">
                      <Box
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "20px",
                          background: "var(--violet-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text size="5">🪙</Text>
                      </Box>
                      <Box>
                        <Text size="2" weight="bold">
                          Token Preview
                        </Text>
                        <Flex align="center" gap="2">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Token"
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "10px",
                              }}
                            />
                          ) : (
                            <Box
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "10px",
                                background: "var(--gray-5)",
                              }}
                            />
                          )}
                          <Text>
                            {formData.name || "Token Name"}
                            {formData.symbol ? ` (${formData.symbol})` : ""}
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                  </Card>
                </Box>

                <Box mt="5">
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    style={{ width: "100%" }}
                    size="3"
                  >
                    {isSubmitting ? (
                      <Flex align="center" gap="2">
                        <span className="loading-spinner"></span>
                        <span>Creating Token...</span>
                      </Flex>
                    ) : (
                      `Create ${formData.tokenType === "fungible" ? "Token" : "NFT"}`
                    )}
                  </Button>
                </Box>
              </form>
            </Box>
          </Tabs.Root>
        </Flex>
      </Card>

      {/* Add some CSS for the loading spinner */}
      <style>{`
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
}
