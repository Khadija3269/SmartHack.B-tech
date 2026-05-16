import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { PreferencesProvider } from "./lib/preferences";
import { bootstrap } from "./lib/store";

const root = ReactDOM.createRoot(document.getElementById("root"));

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#1f3a68",
      fontSize: 18,
    }}>
      Loading HackHub…
    </div>
  );
}

root.render(<LoadingScreen />);

bootstrap().finally(() => {
  root.render(
    <React.StrictMode>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </React.StrictMode>
  );
});
