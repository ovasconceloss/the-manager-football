import React from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const GameFixtureInformation: React.FC = () => {
    const managerClub = localStorage.getItem("manager_club");

    let selectedClub = null;
    if (managerClub) selectedClub = JSON.parse(managerClub);

    return (
        <section className="flex flex-row items-start bg-[#19181F] bg-opacity-20 rounded-sm space-x-14">
            <div className="flex items-center space-x-10">
                <div className="flex flex-col items-center space-y-2">
                    {selectedClub && (
                        <img
                            alt={`${selectedClub.club_name} logo`}
                            className="w-32 h-32 object-contain"
                            src={`data:image/png;base64, ${selectedClub.logo_image ? selectedClub.logo_image : ''}`}
                        />
                    )}
                </div>
                <div className="flex flex-col items-center">
                    <h2 className="text-md text-white">[DATA]</h2>
                    <Separator className="w-80 my-4 border-1 border-[#2A2A35] border-opacity-40" />
                    <h1 className="text-lg font-bold">[TIME CASA] - [TIME FORA]</h1>
                    <h2 className="text-md text-zinc-400">[COMPETIÇÃO] | [ESTÁDIO]</h2>
                    <Separator className="w-80 my-4 border-1 border-[#2A2A35] border-opacity-40" />
                    <h2 className="text-md text-[#67159C] font-bold uppercase">Manager</h2>
                    <h2 className="text-md text-white">[NOME DO TREINADOR]</h2>
                </div>
                <div className="flex flex-col items-center space-y-4">
                    {selectedClub && (
                        <img
                            alt={`${selectedClub.club_name} logo`}
                            className="w-32 h-32 object-contain"
                            src={`data:image/png;base64, ${selectedClub.logo_image ? selectedClub.logo_image : ''}`}
                        />
                    )}
                </div>
            </div>
            <article className="w-[25rem] h-64 p-6 border-[2px] border-zinc-900 border-opacity-90 rounded-md flex flex-col space-y-4">
                <h2 className="text-lg text-[#67159C] text-center font-bold uppercase">{selectedClub.club_name} Stats</h2>
                <div className="flex flex-col space-y-4">
                    <span className={`text-md text-white text-center font-semibold`}>
                        Last 5 Matches
                    </span>
                    <div className="flex justify-center space-x-2">
                        <span className={`w-[2.5rem] p-2 text-center text-md text-white bg-green-700 rounded-sm`}>
                            W
                        </span>
                        <span className={`w-[2.5rem] p-2 text-center text-md text-white bg-red-700 rounded-sm`}>
                            L
                        </span>
                        <span className={`w-[2.5rem] p-2 text-center text-md text-white bg-gray-700 rounded-sm`}>
                            D
                        </span>
                        <span className={`w-[2.5rem] p-2 text-center text-md text-white bg-green-700 rounded-sm`}>
                            W
                        </span>
                        <span className={`w-[2.5rem] p-2 text-center text-md text-white bg-gray-700 rounded-sm`}>
                            D
                        </span>
                    </div>
                </div>
                <div>
                    <Separator className="w-80 my-4 border-[2px] border-zinc-700 border-opacity-40" />
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between text-[16px] text-zinc-300">
                            <span className="text-[16px] text-zinc-300 font-semibold">Goals Scored</span>
                            <span className="font-bold text-green-400">8</span>
                        </div>
                        <div className="flex justify-between text-[16px] text-zinc-300">
                            <span className="text-[16px] text-zinc-300 font-semibold">Goals Conceded</span>
                            <span className="text-red-400 font-bold">3</span>
                        </div>
                    </div>
                </div>
            </article>
            <Card className="w-[25rem] h-64 text-zinc-200 bg-transparent border-2 border-[#2A2A35] rounded-sm">
                <CardHeader>
                    <CardTitle className="text-[18px] text-[#67159C] text-center font-bold uppercase">{selectedClub.club_name} Fixtures</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-36">
                        <div className="flex flex-row items-center py-2 border-b-[2px] border-zinc-400 border-opacity-20 space-x-10">
                            <span className="w-16 text-[16px] text-zinc-300">15/06</span>
                            <img src="/path/to/opponent-logo-1.png" alt="Away Club Logo" className="w-6 h-6 object-contain" />
                            <span className="w-14 text-[13px] truncate">Oponente A</span>
                            <Badge className={`w-12 flex flex-col items-center justify-center bg-[#67159C]`}>H</Badge>
                        </div>
                        <div className="flex flex-row items-center py-2 border-b-[2px] border-zinc-400 border-opacity-20 space-x-10">
                            <span className="w-16 text-[16px] text-zinc-300">22/06</span>
                            <img src="/path/to/opponent-logo-2.png" alt="Away Club Logo" className="w-6 h-6 object-contain" />
                            <span className="w-14 text-[13px] truncate">Oponente B</span>
                            <Badge className={`w-12 flex flex-col items-center justify-center bg-red-800`}>A</Badge>
                        </div>
                        <div className="flex flex-row items-center py-2 border-b-[2px] border-zinc-400 border-opacity-20 space-x-10">
                            <span className="w-16 text-[16px] text-zinc-300">29/06</span>
                            <img src="/path/to/opponent-logo-3.png" alt="Away Club Logo" className="w-6 h-6 object-contain" />
                            <span className="w-14 text-[13px] truncate">Oponente C</span>
                            <Badge className={`w-12 flex flex-col items-center justify-center bg-[#67159C]`}>H</Badge>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </section>
    );
};