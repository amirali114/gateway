import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/DashboardShell";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import AgentsPage from "@/pages/AgentsPage";
import AgentDetailPage from "@/pages/AgentDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import AlertDetailPage from "@/pages/AlertDetailPage";
import AlertConfirmPage from "@/pages/AlertConfirmPage";
import AuditPage from "@/pages/AuditPage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";
import GatewayPage from "@/pages/GatewayPage";
import GatewayConfirmPage from "@/pages/GatewayConfirmPage";
import MotherPage from "@/pages/MotherPage";
import PolicyPage from "@/pages/PolicyPage";
import ReleasePage from "@/pages/ReleasePage";
import SettingsPage from "@/pages/SettingsPage";
import SettingsProductionPage from "@/pages/SettingsProductionPage";
import SyncPage from "@/pages/SyncPage";
import UsersPage from "@/pages/UsersPage";

const queryClient = new QueryClient();

function ProtectedShell() {
  const { auth, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#94a3b8" }}>
        Loading...
      </div>
    );
  }

  if (!auth) {
    return <LoginPage />;
  }

  return (
    <DashboardShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/agents/:agent_id" component={AgentDetailPage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/alerts/:alert_id/confirm" component={AlertConfirmPage} />
        <Route path="/alerts/:alert_id" component={AlertDetailPage} />
        <Route path="/audit" component={AuditPage} />
        <Route path="/diagnostics" component={DiagnosticsPage} />
        <Route path="/gateway/:agent_id/confirm" component={GatewayConfirmPage} />
        <Route path="/gateway" component={GatewayPage} />
        <Route path="/mother" component={MotherPage} />
        <Route path="/policy" component={PolicyPage} />
        <Route path="/release" component={ReleasePage} />
        <Route path="/settings/production" component={SettingsProductionPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/sync" component={SyncPage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/login">
          <Redirect to="/" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </DashboardShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <ProtectedShell />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
