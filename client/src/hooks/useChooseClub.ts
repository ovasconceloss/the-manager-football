import { Club } from "@/types/club";
import { League } from "@/types/league";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllLeagues } from "@/services/api/routes/leagueRoutes";
import { getClubsByCompetition } from "@/services/api/routes/clubRoutest";

export function useChooseClub() {
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [selectedClub, setSelectedClub] = useState<Club | undefined>();
    const [selectedLeague, setSelectedLeague] = useState<League | undefined>();

    const continuePermission = selectedClub !== undefined;

    const handleGetAllLeagues = async () => {
        const leagues = await getAllLeagues();

        if (leagues.success === true) {
            setLeagues(leagues.response?.data.leagues);
        }
    }

    const handleSaveClub = () => {
        localStorage.setItem("manager_club", JSON.stringify(selectedClub));
    }
    const handleContinue = () => {
        if (selectedClub && continuePermission) {
            navigate('/manager/manager-details');
        }
    }

    useEffect(() => {
        const fetchLeagues = async () => {
            await handleGetAllLeagues();
        };
        fetchLeagues();
    }, []);

    useEffect(() => {
        if (leagues.length > 0 && !selectedLeague) {
            setSelectedLeague(leagues[0]);
        }
    }, [leagues, selectedLeague]);

    useEffect(() => {
        const fetchClubs = async () => {
            if (selectedLeague) {
                const clubsResponse = await getClubsByCompetition(selectedLeague.league_id);
                setClubs(clubsResponse.response?.data.clubs);
            }
        };
        fetchClubs();
    }, [selectedLeague]);

    useEffect(() => { handleSaveClub() }, [selectedClub]);

    return { leagues, clubs, selectedLeague, selectedClub, setSelectedLeague, setSelectedClub, handleContinue, continuePermission };
}