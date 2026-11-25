import { Routes, Route, Navigate } from "react-router-dom";
import Protected from "./components/Protected";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NewDeployment from "./pages/NewDeployment";
import DeploymentProgress from "./pages/DeploymentProgress";
import Dashboard from "./pages/Dashboard";
import AppDetail from "./pages/AppDetail";
import Admin from "./pages/Admin";

const page = (el) => (
  <Protected>
    <Shell>{el}</Shell>
  </Protected>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login signup />} />
      <Route path="/dashboard" element={page(<Dashboard />)} />
      <Route path="/deploy/new" element={page(<NewDeployment />)} />
      <Route path="/deploy/:id/progress" element={page(<DeploymentProgress />)} />
      <Route path="/apps/:id" element={page(<AppDetail />)} />
      <Route path="/admin" element={page(<Admin />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
