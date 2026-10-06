import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canView, firstAllowedPath } from "../config/permissions";
import Login from "../modules/Login";
import Layout from "../components/common/Layout";
import Dashboard from "../modules/Dashboard";
import Orders from "../modules/orders/Orders";
import Riders from "../modules/fleet/Riders";
import LiveTracking from "../modules/fleet/LiveTracking";
import CompanyShops from "../modules/catalogue/CompanyShops";
import ItemsCategories from "../modules/catalogue/ItemsCategories";
import Chickmate from "../modules/loyalty/Chickmate";
import Tiers from "../modules/loyalty/Tiers";
import Campaigns from "../modules/loyalty/Campaigns";
import LoyaltySettings from "../modules/loyalty/LoyaltySettings";
import OrderFormPage from "../modules/orders/OrderFormPage";
import Security from "../modules/security/Security";
import Appearance from "../modules/security/Appearance";
import DataSync from "../modules/data/DataSync";
import DeliverySettings from "../modules/settings/DeliverySettings";
import ExceptionSettings from "../modules/settings/ExceptionSettings";
import ExceptionReport from "../modules/reports/ExceptionReport";
import ActivityLog from "../modules/reports/ActivityLog";

export default function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Login />;

  const home = firstAllowedPath(user) || "/dashboard";

  const guard = (moduleName, element) =>
    canView(user, moduleName) ? element : <Navigate to={home} replace />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route path="/dashboard" element={guard("Dashboard", <Dashboard />)} />
        <Route path="/orders" element={guard("Home Delivery Orders", <Orders />)} />
        <Route path="/orders/new" element={guard("Home Delivery Orders", <OrderFormPage />)} />
        <Route path="/orders/:id/edit" element={guard("Home Delivery Orders", <OrderFormPage />)} />
        <Route path="/app-orders/:id/edit" element={guard("Shopify & App Orders", <OrderFormPage appOnly />)} />
        <Route path="/app-orders" element={guard("Shopify & App Orders", <Orders appOnly />)} />
        <Route path="/dispatch" element={guard("Order Dispatch", <Orders dispatch />)} />
        <Route path="/riders" element={guard("Riders", <Riders />)} />
        <Route path="/tracking" element={guard("Live Tracking", <LiveTracking />)} />
        <Route path="/companies/*" element={guard("Business Setup", <CompanyShops />)} />
        <Route path="/items/*" element={guard("Items & Categories", <ItemsCategories />)} />
        <Route path="/chickmate" element={guard("Chickmate Club", <Chickmate />)} />
        <Route path="/tiers" element={guard("Tiers", <Tiers />)} />
        <Route path="/campaigns" element={guard("Campaigns", <Campaigns />)} />
        <Route path="/loyalty-settings" element={guard("Loyalty Settings", <LoyaltySettings />)} />
        <Route path="/security/*" element={guard("Users & Roles", <Security />)} />
        <Route path="/appearance" element={guard("Appearance", <Appearance />)} />
        <Route path="/data-sync" element={guard("Data Sync", <DataSync />)} />
        <Route path="/delivery-settings" element={guard("Delivery Settings", <DeliverySettings />)} />
        <Route path="/exceptions" element={guard("Exception Reporting", <ExceptionReport />)} />
        <Route path="/activity-log" element={guard("Activity Log", <ActivityLog />)} />
        <Route path="/exception-settings" element={guard("Exception Settings", <ExceptionSettings />)} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </Layout>
  );
}