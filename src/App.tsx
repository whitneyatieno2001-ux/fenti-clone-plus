import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AccountProvider } from "./contexts/AccountContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import ManualTrade from "./pages/ManualTrade";
import AssetTrade from "./pages/AssetTrade";
import Futures from "./pages/Futures";
import Bot from "./pages/Bot";
import BotTrade from "./pages/BotTrade";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import TransactionHistory from "./pages/TransactionHistory";
import PaymentMethods from "./pages/PaymentMethods";
import Security from "./pages/Security";
import Notifications from "./pages/Notifications";
import Privacy from "./pages/Privacy";
import HelpSupport from "./pages/HelpSupport";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AccountProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/trade/:assetId" element={<AssetTrade />} />
              <Route path="/futures" element={<Futures />} />
              <Route path="/bot" element={<Bot />} />
              <Route path="/bot/:botId" element={<BotTrade />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/history" element={<TransactionHistory />} />
              <Route path="/payments" element={<PaymentMethods />} />
              <Route path="/security" element={<Security />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<HelpSupport />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AccountProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
