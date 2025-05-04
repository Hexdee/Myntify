import { Container, Theme } from "@radix-ui/themes";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletStatus } from "./WalletStatus";
import { TokenWizard } from "./components/TokenWizard";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { Navbar } from "./components/Navbar";

function App() {
  return (
    <Theme appearance="dark" accentColor="violet">
      <Router>
        <Navbar />
        <Container>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/wallet"
              element={
                <Container
                  mt="5"
                  pt="2"
                  px="4"
                  style={{ background: "var(--gray-a2)", minHeight: 500 }}
                >
                  <WalletStatus />
                </Container>
              }
            />
            <Route path="/create" element={<TokenWizard />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Container>
      </Router>
    </Theme>
  );
}

export default App;
