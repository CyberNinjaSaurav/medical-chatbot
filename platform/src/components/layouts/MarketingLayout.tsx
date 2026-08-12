import { Outlet } from "react-router-dom";
import { MarketingFooter, MarketingNavbar } from "@/components/navigation/MarketingChrome";

export function MarketingLayout() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNavbar />
      <Outlet />
      <MarketingFooter />
    </div>
  );
}
