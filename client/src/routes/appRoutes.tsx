import MenuRoutes from "./menuRoutes";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/menu/*" element={<MenuRoutes />} />
            </Routes>
        </Router>
    );
};

export default App;