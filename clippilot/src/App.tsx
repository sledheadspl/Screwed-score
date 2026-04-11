import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import MainContent from "./components/Layout/MainContent";
import Sidebar from "./components/Layout/Sidebar";
import { ToastContainer } from "./components/Common/Toast";
import Analytics from "./pages/Analytics";
import Clips from "./pages/Clips";
import Dashboard from "./pages/Dashboard";
import License from "./pages/License";
import Settings from "./pages/Settings";
import Streams from "./pages/Streams";
import { useSettingsStore } from "./store/settingsStore";

export default function App() {
  const { initializeDb } = useSettingsStore();

  useEffect(() => {
    initializeDb().catch(console.error);
  }, [initializeDb]);

  return (
    <HashRouter>
      <div className="flex h-screen bg-dark-950 overflow-hidden">
        <Sidebar />
        <MainContent>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clips" element={<Clips />} />
            <Route path="/streams" element={<Streams />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/license" element={<License />} />
          </Routes>
        </MainContent>
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
