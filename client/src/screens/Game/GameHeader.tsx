import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

export const GameHeader: React.FC = () => {
    const location = useLocation();

    const managerClub = localStorage.getItem("manager_club");
    let selectedClub = null;
    if (managerClub) {
        selectedClub = JSON.parse(managerClub);
    }

    const isLinkActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <header className="p-5 relative bg-[#19181F] select-none border-b-2 border-[#2A2A35]">
            <section className="w-full flex items-center justify-between">
                <div className="flex items-center">
                    {selectedClub && (
                        <img
                            alt={`${selectedClub.club_name} logo`}
                            className="w-15 h-15 mr-0.5 object-contain"
                            src={`data:image/png;base64, ${selectedClub.logo_image ? selectedClub.logo_image : ''}`}
                        />
                    )}
                    <div className="ml-5">
                        <h1 className="text-xl text-white">Home</h1>
                        <h2 className="text-md text-[#A1A1AA]">
                            Manager Name - {selectedClub ? selectedClub.club_name : 'No Club Selected'}
                        </h2>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        className="w-[3.5rem] bg-transparent p-5 border-2 border-[#2A2A35] text-md cursor-pointer uppercase rounded-sm
                        hover:bg-[#2A2A35]">
                        <Settings />
                    </Button>
                    <div className="flex items-center">
                        <Button
                            className="bg-[#2A2A35] text-white p-5 text-md cursor-pointer uppercase rounded-r-none rounded-l-sm
                            hover:bg-[#3b3e4e] hover:border-[#3b3e4e]">
                            10 Jan 2024
                        </Button>
                        <Button
                            className="bg-[#67159C] text-white p-5 text-md cursor-pointer uppercase rounded-l-none rounded-r-sm
                            hover:bg-[#66159CD3] hover:border-[#66159CD3]">
                            Continue
                        </Button>
                    </div>
                </div>
            </section>
            <section className="flex justify-center space-x-5">
                <Link to="/game/club">
                    <Button
                        className={`w-[10rem] p-5 border-b-3 border-[#2A2A35] bg-transparent rounded-none
                        hover:border-b-[#67159C] hover:bg-transparent cursor-pointer
                        ${isLinkActive('/game/club') ? 'border-b-[#67159C] text-white' : 'text-white'}`
                        }
                    >
                        Club
                    </Button>
                </Link>
                <Link to="/game/squad">
                    <Button
                        className={`w-[10rem] p-5 border-b-3 border-[#2A2A35] bg-transparent rounded-none
                        hover:border-b-[#67159C] hover:bg-transparent cursor-pointer
                        ${isLinkActive('/game/squad') ? 'border-b-[#67159C] text-white' : 'text-white'}`
                        }
                    >
                        Squad
                    </Button>
                </Link>

                <Link to="/game/home">
                    <Button
                        className={`w-[10rem] p-5 border-b-3 border-[#2A2A35] bg-transparent rounded-none
                        hover:border-b-[#67159C] hover:bg-transparent cursor-pointer
                        ${isLinkActive('/game/home') ? ' border-b-[#67159C] text-white' : 'text-white'}`
                        }
                    >
                        Home
                    </Button>
                </Link>
                <Link to="/game/profile">
                    <Button
                        className={`w-[10rem] p-5 border-b-3 border-[#2A2A35] bg-transparent rounded-none
                        hover:border-b-[#67159C] hover:bg-transparent cursor-pointer
                        ${isLinkActive('/game/profile') ? 'border-b-[#67159C] text-white' : 'text-white'}`
                        }
                    >
                        Profile
                    </Button>
                </Link>
            </section>
        </header>
    );
};