import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ForecastOffice } from "../app/forecast/ForecastOffice";
import "../app/globals.css";

if (typeof document !== "undefined") {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("정적 앱을 마운트할 root 요소를 찾을 수 없습니다.");
  }

  createRoot(root).render(
    <StrictMode>
      <ForecastOffice />
    </StrictMode>,
  );
}
