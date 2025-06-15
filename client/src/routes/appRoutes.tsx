import MenuRoutes from "./menuRoutes";
import GameRoutes from "./gameRoutes";
import ManagerRoutes from "./managerRoutes";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/*" element={<MenuRoutes />} />
                <Route path="/game/*" element={<GameRoutes />} />
                <Route path="/manager/*" element={<ManagerRoutes />} />
            </Routes>
        </Router>
    );
};

export default App;