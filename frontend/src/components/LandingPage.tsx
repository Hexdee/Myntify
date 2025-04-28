import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Link,
} from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <Container size="3" mt="6">
      <Box mb="6" style={{ textAlign: "center" }}>
        <Heading size="9" mb="2">
          Myntify
        </Heading>
        <Text size="5" color="gray">
          Create and manage custom tokens on the IOTA network
        </Text>
      </Box>

      <Flex direction="column" gap="6">
        {/* Hero Section */}
        <Box
          p="6"
          style={{
            background:
              "linear-gradient(to right, var(--violet-5), var(--indigo-5))",
            borderRadius: "12px",
            color: "white",
          }}
        >
          <Flex
            direction={{ initial: "column", md: "row" }}
            gap="6"
            align="center"
          >
            <Box style={{ flex: 1 }}>
              <Heading size="7" mb="3">
                Launch Your Own Token in Minutes
              </Heading>
              <Text size="4" mb="4" style={{ maxWidth: "600px" }}>
                Create fungible tokens or NFTs on the IOTA network with a
                simple, user-friendly interface. No coding required.
              </Text>
              <Button
                size="3"
                onClick={() => navigate("/create")}
                style={{
                  background: "white",
                  color: "var(--violet-9)",
                  fontWeight: "bold",
                }}
              >
                Create Token Now
              </Button>
            </Box>
            <Box style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <img
                src="/token-illustration.svg"
                alt="Token Illustration"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  opacity: 0.9,
                }}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/400x300?text=IOTA+Tokens";
                }}
              />
            </Box>
          </Flex>
        </Box>

        {/* Features Section */}
        <Box mt="6">
          <Heading size="6" mb="4">
            Key Features
          </Heading>
          <Flex direction={{ initial: "column", md: "row" }} gap="4">
            <Card size="3" style={{ flex: 1 }}>
              <Flex direction="column" gap="2">
                <Heading size="4">Fungible Tokens</Heading>
                <Text>
                  Create your own cryptocurrency with customizable supply, name,
                  and symbol. Perfect for community tokens, rewards, or in-app
                  currencies.
                </Text>
              </Flex>
            </Card>
            <Card size="3" style={{ flex: 1 }}>
              <Flex direction="column" gap="2">
                <Heading size="4">Non-Fungible Tokens</Heading>
                <Text>
                  Mint unique digital assets as NFTs. Ideal for digital art,
                  collectibles, certificates, or access passes.
                </Text>
              </Flex>
            </Card>
            <Card size="3" style={{ flex: 1 }}>
              <Flex direction="column" gap="2">
                <Heading size="4">IOTA Network</Heading>
                <Text>
                  Leverage the speed, security, and fee-less structure of the
                  IOTA network for your tokens and digital assets.
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Box>

        {/* How It Works Section */}
        <Box mt="6">
          <Heading size="6" mb="4">
            How It Works
          </Heading>
          <Flex direction="column" gap="3">
            <Card>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    background: "var(--violet-9)",
                    color: "white",
                    width: "32px",
                    height: "32px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  1
                </Box>
                <Box>
                  <Heading size="3">Connect Your Wallet</Heading>
                  <Text size="2">Connect your IOTA wallet to get started</Text>
                </Box>
              </Flex>
            </Card>
            <Card>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    background: "var(--violet-9)",
                    color: "white",
                    width: "32px",
                    height: "32px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  2
                </Box>
                <Box>
                  <Heading size="3">Configure Your Token</Heading>
                  <Text size="2">
                    Set name, symbol, supply, and other properties
                  </Text>
                </Box>
              </Flex>
            </Card>
            <Card>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    background: "var(--violet-9)",
                    color: "white",
                    width: "32px",
                    height: "32px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  3
                </Box>
                <Box>
                  <Heading size="3">Create & Mint</Heading>
                  <Text size="2">
                    Approve the transaction and receive your tokens
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        </Box>

        {/* CTA Section */}
        <Box
          mt="6"
          p="6"
          style={{
            background: "var(--gray-2)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Heading size="6" mb="3">
            Ready to Create Your Token?
          </Heading>
          <Text size="3" mb="4">
            Start building your token ecosystem on IOTA today.
          </Text>
          <Button
            size="3"
            onClick={() => navigate("/create")}
            style={{
              background: "var(--violet-9)",
              color: "white",
              fontWeight: "bold",
            }}
          >
            Get Started
          </Button>
        </Box>

        {/* Footer */}
        <Box mt="6" pt="4" style={{ borderTop: "1px solid var(--gray-5)" }}>
          <Flex justify="between" align="center">
            <Text size="2" color="gray">
              © {new Date().getFullYear()} Myntify
            </Text>
            <Flex gap="4">
              <Link href="https://docs.iota.org" target="_blank" size="2">
                Documentation
              </Link>
              <Link
                href="https://github.com/iota-community"
                target="_blank"
                size="2"
              >
                GitHub
              </Link>
              <Link href="https://discord.iota.org" target="_blank" size="2">
                Discord
              </Link>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Container>
  );
}
