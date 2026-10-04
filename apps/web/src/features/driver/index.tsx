import "./index.css";
import ReactDOM from "react-dom/client";
import { DriverApp } from "./DriverApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<DriverApp />);
}