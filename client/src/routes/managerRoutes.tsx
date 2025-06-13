import { Route, Routes } from "react-router-dom";
import ChooseClub from "@/screens/Managers/ChooseClub";
import ManagerDetails from "@/screens/Managers/ManagerDetails";

const ManagerRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/choose-club" element={<ChooseClub />} />
            <Route path="/manager-details" element={<ManagerDetails />} />
        </Routes>
    );
};

export default ManagerRoutes;