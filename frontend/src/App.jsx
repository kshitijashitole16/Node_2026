import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { AuthPortal } from "./pages/AuthPortal.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { AnmolHomePage } from "./pages/AnmolHomePage.jsx";

const ANMOL_EMAIL = "anmol@gmail.com";

function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  const email = user.email?.trim().toLowerCase();
  if (email === ANMOL_EMAIL) return <AnmolHomePage />;
  return <HomePage />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <AuthPortal />}
      />
      <Route path="/home" element={<HomeRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
