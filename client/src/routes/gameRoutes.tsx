import GameHome from "@/screens/Game/GameHome";
import { Route, Routes } from "react-router-dom";

const GameRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/home" element={<GameHome />} />
        </Routes>
    );
};

export default GameRoutes;