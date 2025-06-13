import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const leagueLogos: Record<string, string> = {
    "Premier League": "/assets/leagues/premier-league.png",
    "La Liga": "/assets/leagues/la-liga.png",
    "Serie A": "/assets/leagues/serie-a.png",
    "Bundesliga": "/assets/leagues/bundesliga.png",
};

const leagues = [
    {
        id: "premier-league",
        name: "Premier League",
        country: "England",
        logo: leagueLogos["Premier League"],
        clubs: [
            { name: "Arsenal" },
            { name: "Aston Villa" },
            { name: "Bournemouth" },
            { name: "Brentford" },
            { name: "Brighton" },
            { name: "Chelsea" },
            { name: "Crystal Palace" },
            { name: "Everton" },
            { name: "Fulham" },
            { name: "Ipswich" },
            { name: "Leicester" },
            { name: "Liverpool" },
            { name: "Man City" },
            { name: "Man Utd" },
            { name: "Newcastle" },
            { name: "Nottm Forest" },
            { name: "Southampton" },
            { name: "Tottenham" },
            { name: "West Ham" },
            { name: "Wolves" },
        ],
    },
    {
        id: "la-liga",
        name: "La Liga",
        country: "Spain",
        logo: leagueLogos["La Liga"],
        clubs: [
            { name: "Real Madrid" },
            { name: "Barcelona" },
            { name: "Atlético Madrid" },
            { name: "Sevilla" },
            { name: "Valencia" },
            { name: "Real Sociedad" },
            { name: "Villarreal" },
            { name: "Athletic Bilbao" },
            { name: "Real Betis" },
            { name: "Celta Vigo" },
            { name: "Espanyol" },
            { name: "Getafe" },
            { name: "Granada" },
            { name: "Osasuna" },
            { name: "Mallorca" },
            { name: "Alavés" },
            { name: "Cádiz" },
            { name: "Elche" },
            { name: "Levante" },
            { name: "Rayo Vallecano" },
        ],
    },
    {
        id: "serie-a",
        name: "Serie A",
        country: "Italy",
        logo: leagueLogos["Serie A"],
        clubs: [
            { name: "Juventus" },
            { name: "Inter" },
            { name: "Milan" },
            { name: "Napoli" },
            { name: "Roma" },
            { name: "Lazio" },
            { name: "Atalanta" },
            { name: "Fiorentina" },
            { name: "Torino" },
            { name: "Udinese" },
            { name: "Bologna" },
            { name: "Sassuolo" },
            { name: "Sampdoria" },
            { name: "Genoa" },
            { name: "Cagliari" },
            { name: "Verona" },
            { name: "Empoli" },
            { name: "Spezia" },
            { name: "Salernitana" },
            { name: "Venezia" },
        ],
    },
    {
        id: "bundesliga",
        name: "Bundesliga",
        country: "Germany",
        logo: leagueLogos["Bundesliga"],
        clubs: [
            { name: "Bayern Munich" },
            { name: "Borussia Dortmund" },
            { name: "RB Leipzig" },
            { name: "Bayer Leverkusen" },
            { name: "Wolfsburg" },
            { name: "Eintracht Frankfurt" },
            { name: "Union Berlin" },
            { name: "Freiburg" },
            { name: "Mainz" },
            { name: "Hoffenheim" },
            { name: "Borussia M'gladbach" },
            { name: "Stuttgart" },
            { name: "Augsburg" },
            { name: "Hertha Berlin" },
            { name: "Bochum" },
            { name: "Schalke" },
            { name: "Werder Bremen" },
            { name: "Köln" },
        ],
    },
];

const ChooseClub: React.FC = () => {
    const [selectedLeague, setSelectedLeague] = useState(leagues[0]);

    return (
        <main className="relative h-screen w-screen bg-[#19181F] flex items-center justify-center select-none">
            <Card className="w-full max-w-6xl flex flex-col md:flex-row border-0 bg-[#19181F]">
                <aside className="md:w-[50rem] p-8 flex flex-col gap-6 min-h-[36rem]">
                    <div>
                        <div className="mb-10 flex flex-col justify-start">
                            <h2 className="text-md text-white uppercase tracking-widest font-semibold">Waht Club do you want to manage?</h2>
                        </div>
                        <ScrollArea className="h-[30rem]">
                            <div className="flex flex-col gap-3">
                                {leagues.map((league) => (
                                    <Button
                                        key={league.id}
                                        variant={selectedLeague.id === league.id ? "default" : "ghost"}
                                        className={`w-full flex justify-start items-center px-2 py-8 rounded-md cursor-pointer text-xl font-semibold transition
                      ${selectedLeague.id === league.id
                                                ? "bg-[#67159C] text-white"
                                                : "bg-[#23263a] text-[#E5E5E5] hover:bg-[#67159C] hover:text-white"}
                    `}
                                        onClick={() => setSelectedLeague(league)}
                                    >
                                        <img
                                            src={league.logo}
                                            className="w-8 h-8 object-contain rounded"
                                        />
                                        <div className="flex flex-col items-start">
                                            <span className="uppercase text-xs text-[#A1A1AA]">{league.country}</span>
                                            <span>{league.name}</span>
                                        </div>
                                        {selectedLeague.id === league.id && (
                                            <ChevronRight className="ml-auto h-5 w-5 text-white" />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </aside>
                <section className="md:w-[80rem] p-10 flex flex-col gap-6 bg-[#2A2A35] rounded-md">
                    <div>
                        <div className="text-xs text-[#A1A1AA] uppercase tracking-widest mb-1">
                            Choose a Club
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">
                            Choose a Club to manage
                        </h2>
                        <div className="text-[#A1A1AA] text-sm mb-4">
                            Choose from the options to select the club you want to start your career with.
                        </div>
                    </div>
                    <ScrollArea className="h-[28rem]">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedLeague.clubs.map((club) => (
                                <Card
                                    key={club.name}
                                    className="p-4 flex items-center bg-[#23263a] hover:bg-[#67159C] transition-colors cursor-pointer border-0 rounded-lg"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-white text-lg">{club.name}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </section>
            </Card>
        </main>
    );
};

export default ChooseClub;