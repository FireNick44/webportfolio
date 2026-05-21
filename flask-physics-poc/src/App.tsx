import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import AppStateProvider from "./components/AppStateProvider";
import FlaskPage from "./pages/FlaskPage";
import MePage from "./pages/MePage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

function App() {
  return (
    <AppStateProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<FlaskPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppStateProvider>
  );
}

export default App;
