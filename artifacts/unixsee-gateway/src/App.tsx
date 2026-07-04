import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import AgentsPage from "@/pages/AgentsPage";
import AgentDetailPage from "@/pages/AgentDetailPage";
import ReleasePage from "@/pages/ReleasePage";
import MotherPage from "@/pages/MotherPage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";
import GatewayPage from "@/pages/GatewayPage";
import PolicyPage from "@/pages/PolicyPage";
import AlertsPage from "@/pages/AlertsPage";
import UsersPage from "@/pages/UsersPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import SettingsProductionPage from "@/pages/SettingsProductionPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={DashboardPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/agents/:agent_id" component={AgentDetailPage} />
      <Route path="/release" component={ReleasePage} />
      <Route path="/mother" component={MotherPage} />
      <Route path="/diagnostics" component={DiagnosticsPage} />
      <Route path="/gateway" component={GatewayPage} />
      <Route path="/policy" component={PolicyPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/settings/production" component={SettingsProductionPage} />
      <Route path="/settings" component={SettingsPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
