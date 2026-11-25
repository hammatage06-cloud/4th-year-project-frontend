import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api";

export default function Protected({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}
