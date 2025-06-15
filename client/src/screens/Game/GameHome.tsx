import { GameHeader } from "./GameHeader";
import { GameFixtureInformation } from "./GameFixtureInformation";

const GameHome: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#19181F] flex flex-col">
            <GameHeader />
            <main className="w-full px-4 py-4">
                <section className="flex flex-col space-y-4">
                    <GameFixtureInformation />
                </section>
            </main>
        </div>
    );
};

export default GameHome;