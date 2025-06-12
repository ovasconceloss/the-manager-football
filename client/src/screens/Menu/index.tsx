import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { exit } from '@tauri-apps/plugin-process';
import { Settings, DoorOpen, User, ShieldHalf, LogOut } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCreateSave } from "@/hooks/useCreateSave";

const Menu: React.FC = () => {
    const handleExit = async () => await exit(0);
    const { handleCreateNewSave, error, loading } = useCreateSave();

    return (
        <main className="relative h-screen w-screen bg-[url('../assets/images/background_menu.png')] bg-cover bg-center select-none">
            <section className="flex items-center justify-center h-full">
                <article className="p-8 flex flex-col justify-center bg-[#19181F] bg-opacity-90 border border-[#1E1E26] rounded-lg shadow-2xl w-[40rem]">
                    <div className="flex items-center mb-6">
                        <User className="w-[3rem] h-[3rem] text-white" />
                        <h2 className="text-white text-4xl font-extrabold uppercase ml-4">Career</h2>
                    </div>
                    <p className="text-gray-300 text-base mb-6 leading-relaxed">The full featured simulation experience. Manage your team, your way.</p>

                    <div className="flex items-center mb-8 bg-[#2A2A35] p-4 rounded-lg shadow-md">
                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4">
                            <ShieldHalf className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                            <h2 className="text-gray-400 text-sm uppercase">Most Recent</h2>
                            <h3 className="text-white text-lg font-medium">None</h3>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Button className="w-full p-5 flex justify-start uppercase text-lg font-semibold cursor-pointer 
            bg-[#1E1E26] text-white border border-[#1E1E26] rounded-md hover:bg-[#67159C]">
                            Load Game
                        </Button>
                        <Button onClick={handleCreateNewSave} className="w-full p-5 flex justify-start uppercase text-lg font-semibold cursor-pointer 
              bg-[#1E1E26] text-white border border-[#1E1E26] rounded-md hover:bg-[#67159C]">
                            {loading ? "Loading..." : "Start a New Game"}
                        </Button>
                        {error && <div className="text-red-400 mt-2">{error}</div>}
                    </div>
                </article>
            </section>
            <section className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                <Button className="w-48 cursor-pointer flex items-center gap-3 text-white text-lg font-normal 
        border border-[#19181F] bg-[#1E1E26] hover:bg-[#67159C] hover:border-[#67159C] rounded-lg p-5 px-6">
                    <Settings className="w-6 h-6" /> Preferences
                </Button>
                <Link to={'https://github.com/ovasconceloss'} target="_blank" rel="noopener noreferrer">
                    <Button className="w-48 cursor-pointer flex items-center gap-3 text-white text-lg font-normal 
        border border-[#19181F] bg-[#1E1E26] hover:bg-[#67159C] hover:border-[#67159C] rounded-lg p-5 px-6">
                        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <title>GitHub</title>
                            <path fill="white" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 
            11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 
            3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 
            2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 
            1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 
            2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 
            3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 
            22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                        </svg>
                        Github
                    </Button>
                </Link>
                <AlertDialog>
                    <AlertDialogTrigger className="w-48 cursor-pointer flex items-center justify-center gap-3 text-white text-lg font-normal 
        border border-[#19181F] bg-[#1E1E26] hover:bg-[#67159C] rounded-lg px-6"><DoorOpen className="w-6 h-6" /> Exit</AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#19181F] border-zinc-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-300">
                                This action will close the game, are you sure you really want to leave?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="w-32 cursor-pointer text-white bg-[#67159C] border border-[#67159C] hover:bg-[#1E1E26] hover:text-[#67159C]">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleExit}
                                className="w-32 cursor-pointer text-white bg-[#1E1E26] border border-zinc-800 hover:bg-[#67159C] hover:border-[#67159C]">
                                <LogOut /> Exit
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>
        </main>
    );
};

export default Menu;