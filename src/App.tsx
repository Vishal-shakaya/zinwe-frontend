import type { ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

export default function App(): ReactElement {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
