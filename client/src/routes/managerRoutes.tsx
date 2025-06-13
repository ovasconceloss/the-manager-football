import { Route, Routes } from "react-router-dom";
import ChooseClub from "@/screens/Managers/ChooseClub";

const ManagerRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/choose-club" element={<ChooseClub />} />
        </Routes>
    );
};

export default ManagerRoutes;