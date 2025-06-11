import Menu from "@/screens/Menu";
import { Route, Routes } from "react-router-dom"

const MenuRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Menu />} />
        </Routes>
    );
};

export default MenuRoutes;