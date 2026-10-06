import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { BrandProvider } from "./context/BrandContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { SearchProvider } from "./context/SearchContext";
import { LiveProvider } from "./context/LiveContext";
import { LookupsProvider } from "./context/LookupsContext";
import AppRoutes from "./routes/AppRoutes";
import SessionTimeoutModal from "./components/auth/SessionTimeoutModal";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <BrandProvider>
          <AuthProvider>
            <LiveProvider>
              <LookupsProvider>
                <ToastProvider>
                  <SearchProvider>
                    <AppRoutes />
                    <SessionTimeoutModal />
                  </SearchProvider>
                </ToastProvider>
              </LookupsProvider>
            </LiveProvider>
          </AuthProvider>
        </BrandProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
