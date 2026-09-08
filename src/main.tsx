import { createRoot } from "react-dom/client";
import Game from "./components/Game";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Emberfall root element was not found.");

createRoot(root).render(<Game />);
