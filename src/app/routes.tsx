import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Jobs } from "./pages/Jobs";
import { JobDetail } from "./pages/JobDetail";
import { Schedule } from "./pages/Schedule";
import { Estimates } from "./pages/Estimates";
import { AIAssistant } from "./pages/AIAssistant";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "customers", Component: Customers },
      { path: "customers/:id", Component: CustomerDetail },
      { path: "jobs", Component: Jobs },
      { path: "jobs/:id", Component: JobDetail },
      { path: "schedule", Component: Schedule },
      { path: "estimates", Component: Estimates },
      { path: "ai-assistant", Component: AIAssistant },
      { path: "*", Component: NotFound },
    ],
  },
]);
