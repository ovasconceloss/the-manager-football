import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChooseClub } from "@/hooks/useChooseClub";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const ChooseClub: React.FC = () => {
    const {
        leagues,
        clubs,
        selectedLeague,
        selectedClub,
        setSelectedLeague,
        setSelectedClub,
        handleContinue,
        continuePermission
    } = useChooseClub();

    return (
        <main className="relative h-screen w-screen bg-[#19181F] flex items-center justify-center select-none">
            <Card className="w-full max-w-6xl flex flex-col md:flex-row border-0 bg-[#19181F]">
                <aside className="md:w-[50rem] p-8 flex flex-col gap-6 min-h-[36rem]">
                    <div>
                        <div className="mb-10 flex flex-col justify-start">
                            <h2 className="text-sm text-white uppercase tracking-widest font-semibold">What Club do you want to manage?</h2>
                        </div>
                        <ScrollArea className="h-[30rem]">
                            <div className="flex flex-col gap-3">
                                {leagues.map((league) => {
                                    return (
                                        <Button
                                            key={league.league_id}
                                            variant={selectedLeague && selectedLeague.league_id === league.league_id ? "default" : "ghost"}
                                            className={
                                                `w-full flex justify-start items-center px-2 py-8 rounded-md cursor-pointer text-xl font-semibold transition
                                                ${selectedLeague && selectedLeague.league_id === league.league_id
                                                    ? "bg-[#67159C] text-white"
                                                    : "bg-[#23263a] text-[#E5E5E5] hover:bg-[#67159C] hover:text-white"}`
                                            }
                                            onClick={() => setSelectedLeague(league)}
                                        >
                                            <img
                                                src={`data: image / png; base64, ${league.nation_flag ? league.nation_flag : ' '}`}
                                                className="w-8 h-8 object-contain rounded"
                                            />
                                            <div className="flex flex-col items-start">
                                                <span className="uppercase text-xs text-[#A1A1AA]">{league.nation_name}</span>
                                                <span>{league.league_name}</span>
                                            </div>
                                            {selectedLeague && selectedLeague.league_id === league.league_id && (
                                                <ChevronRight className="ml-auto h-5 w-5 text-white" />
                                            )}
                                        </Button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                        <div className="flex items-center justify-between">
                            <Link to={'/'}>
                                <Button className="p-3 w-[7.0rem] bg-transparent border-2 border-[#2A2A35] text-white cursor-pointer
                            hover:bg-[#2A2A35]">
                                    <ChevronLeft /> Back
                                </Button>
                            </Link>
                            <Button
                                onClick={handleContinue}
                                disabled={!continuePermission}
                                className=" p-3 w-[7.0rem] bg-transparent border-2 border-[#2A2A35] text-white cursor-pointer hover:bg-[#2A2A35]">
                                Continue <ChevronRight />
                            </Button>
                        </div>
                        <h2 className={`mt-5 text-xs text-right text-[#A1A1AA] transition-all uppercase tracking-widest ${continuePermission ? 'hidden' : ''}`}>
                            Select a club to continue
                        </h2>
                        <div className="mt-10">
                            <div className={`w-full p-2 bg-[#23263A] border-b-5 border-b-[#67159C] rounded-md ${!selectedClub ? 'hidden' : ''}`}>
                                <div className="flex items-start">
                                    <img
                                        src={`data: image / png; base64, ${selectedClub?.logo_image}`}
                                        className="w-15 h-15 object-contain rounded"
                                    />
                                    <div className="ml-2 flex flex-col">
                                        <h2 className="text-[#A1A1AA] text-sm uppercase font-semibold">{selectedClub?.abbreviation} ({selectedClub?.foundation_year})</h2>
                                        <h2 className="text-white text-xl font-semibold">{selectedClub?.club_name}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
                <section className="md:w-[80rem] p-10 flex flex-col gap-6 bg-[#2A2A35] rounded-md">
                    <div>
                        <div className="text-xs text-[#A1A1AA] uppercase tracking-widest mb-1">
                            Choose a Club
                        </div>
                        <div className="mt-5 flex items-center">
                            <img
                                src={`data: image / png; base64, ${selectedLeague?.league_logo_image ? selectedLeague?.league_logo_image : ''}`}
                                className="w-18 h-18 mr-5 object-contain rounded"
                            />
                            <div>
                                <h2 className="text-2xl font-bold mb-2 text-white">Choose a Club to manage</h2>
                                <div className="text-[#A1A1AA] text-sm mb-4">
                                    Choose from the options to select the club you want to start your career with.
                                </div>
                            </div>
                        </div>
                    </div>
                    <ScrollArea className="h-[35rem]">
                        <div className="grid grid-cols-5 md:grid-cols-2 gap-2">
                            {clubs.map((club) => (
                                <Card
                                    key={club.club_id || club.club_name}
                                    onClick={() => setSelectedClub(club)}
                                    className={
                                        `w-full p-4 flex justify-between bg-[#23263a] hover:bg-[#67159C] transition-colors cursor-pointer border-0 rounded-md
                                        ${selectedClub && selectedClub.club_id === club.club_id
                                            ? "bg-[#67159C] text-white"
                                            : "bg-[#23263a] text-[#E5E5E5] hover:bg-[#67159C] hover:text-white"}
                                    `}
                                >
                                    <div className="w-full flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-white text-[1.0rem] font-semibold">{club.club_name}</span>
                                            <span className="text-[#A1A1AA] text-xs">Club Reputation: {club.reputation}</span>
                                        </div>
                                        <img
                                            src={`data: image / png; base64, ${club.logo_image}`}
                                            className="w-8 h-8 object-contain rounded"
                                        />
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </section>
            </Card>
        </main>
    );
};

export default ChooseClub;