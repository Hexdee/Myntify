import { ConnectButton } from "@iota/dapp-kit";
import { Box, Flex, Heading, Link } from "@radix-ui/themes";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useCurrentAccount } from "@iota/dapp-kit";

export function Navbar() {
  const location = useLocation();
  const account = useCurrentAccount();

  return (
    <Flex
      position="sticky"
      px="4"
      py="2"
      justify="between"
      style={{
        borderBottom: "1px solid var(--gray-a2)",
      }}
    >
      <Flex align="center" gap="4">
        <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Heading size="5">Myntify</Heading>
        </RouterLink>

        <Flex gap="4" ml="6">
          <Link
            asChild
            style={{
              fontWeight: location.pathname === "/create" ? "bold" : "normal",
              color:
                location.pathname === "/create" ? "var(--violet-9)" : "inherit",
            }}
          >
            <RouterLink to="/create">Create Token</RouterLink>
          </Link>
          {account && (
            <Link
              asChild
              style={{
                fontWeight:
                  location.pathname === "/dashboard" ? "bold" : "normal",
                color:
                  location.pathname === "/dashboard"
                    ? "var(--violet-9)"
                    : "inherit",
              }}
            >
              <RouterLink to="/dashboard">Dashboard</RouterLink>
            </Link>
          )}
        </Flex>
      </Flex>

      <Box>
        <ConnectButton />
      </Box>
    </Flex>
  );
}
