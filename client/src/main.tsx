import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'date-fns/locale/vi';

createRoot(document.getElementById("root")!).render(<App />);
