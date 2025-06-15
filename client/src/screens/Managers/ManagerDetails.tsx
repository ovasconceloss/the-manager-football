import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Link, useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useManagerCreation } from "@/hooks/useManagerCreate";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ManagerDetails: React.FC = () => {
    const {
        managerData,
        nations,
        cities,
        selectedClub,
        isLoadingNations,
        isLoadingCities,
        isSaving,
        updatePersonalDetails,
        updateAttributes,
        updateTacticalStyle,
        validateForm,
        saveManager,
        allowedPoints,
        totalUsedPoints,
        tacticalTypes,
        tacticalFormations,
        isLoadingTacticalData,
    } = useManagerCreation();

    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("personal");

    const handleSaveAndContinue = async () => {
        const success = await saveManager();

        if (success === true) {
            navigate('/game/home');
        }
    };

    const selectedPlayingStyle = tacticalTypes?.find(
        (type) => type.id === managerData.tacticalStyle.playingStyle
    );

    const selectedFormation = tacticalFormations?.find(
        (form) => form.id === managerData.tacticalStyle.formationPreference
    );

    const AttributeSlider: React.FC<{ label: string; value: number; onChange: (value: number[]) => void; max?: number }> = ({ label, value, onChange, max = 20 }) => (
        <div className="space-y-2">
            <Label className="text-white text-sm flex justify-between items-center">
                <span>{label}</span>
                <span className="font-bold text-white">{value}</span>
            </Label>
            <Slider
                defaultValue={[value]}
                min={1}
                max={max}
                step={1}
                onValueChange={onChange}
                className="[&>[data-orientation=horizontal]]:h-2 [&>[data-orientation=horizontal]>span]:bg-[#67159C] [&>[data-orientation=horizontal]>span>span]:bg-[#2A2A35]"
            />
        </div>
    );

    return (
        <main className="relative h-screen w-screen bg-[#19181F] flex items-center justify-center select-none">
            <Card className="w-full max-w-6xl flex flex-col md:flex-row border-0 bg-[#19181F]">
                <aside className="md:w-[50rem] p-8 flex flex-col gap-6 min-h-[50rem]">
                    <div className="mb-10 flex flex-col justify-start">
                        <h2 className="text-md text-white uppercase tracking-widest font-semibold">Define Your Manager Identity</h2>
                        <p className="text-sm text-[#A1A1AA] mt-2">Personal details, attributes, and tactical preferences.</p>
                    </div>
                    <Card className="bg-[#19181F] border-2 border-[#19181F] text-white p-6 rounded-md">
                        <h3 className="text-xl font-bold mb-4 border-b border-[#2A2A35] pb-2">Manager Summary</h3>
                        <div className="flex items-end space-x-4 mb-4">
                            {managerData.personalDetails.image ? (
                                <img
                                    src={managerData.personalDetails.image}
                                    alt="Manager Avatar"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-[#67159C]"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-[#2A2A35] flex items-center justify-center text-3xl font-bold">
                                    {managerData.personalDetails.firstName ? managerData.personalDetails.firstName.charAt(0) : ''}
                                    {managerData.personalDetails.lastName ? managerData.personalDetails.lastName.charAt(0) : ''}
                                </div>
                            )}
                            <div>
                                <h4 className="text-lg font-semibold">{managerData.personalDetails.firstName} {managerData.personalDetails.lastName}</h4>
                                <p className="w-full flex items-center text-sm text-[#A1A1AA]">
                                    <img
                                        className={`w-5 h-5 mr-0.5 object-contain ${nations.find(n => n.nation_id === managerData.personalDetails.nationalityId)?.flag_image ? '' : 'hidden'}`}
                                        src={`data: image / png; base64, ${nations.find(n => n.nation_id === managerData.personalDetails.nationalityId)?.flag_image
                                            ? nations.find(n => n.nation_id === managerData.personalDetails.nationalityId)?.flag_image : ''
                                            }`}
                                        alt=""
                                    />
                                    {nations.find(n => n.nation_id === managerData.personalDetails.nationalityId)?.nation_name || 'Nationality unknown'}
                                </p>
                                <p className="text-sm text-[#A1A1AA]">
                                    {managerData.personalDetails.dateOfBirth ? `${new Date().getFullYear() - new Date(managerData.personalDetails.dateOfBirth).getFullYear()} years old` : 'Age unknown'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold text-[#A1A1AA]">Experience:</span> <span className="capitalize">{managerData.personalDetails.playingCareer.replace('-', ' ')}</span></p>
                            <p><span className="font-semibold text-[#A1A1AA]">Preferred Formation:</span> {selectedFormation?.name || 'Not set'}</p>
                            <p><span className="font-semibold text-[#A1A1AA]">Playing Style:</span> {selectedPlayingStyle?.name || 'Not set'}</p>
                        </div>
                        <div className="border-t border-[#2A2A35] pt-2">
                            <div className={`w-full mt-2 ${!selectedClub ? 'hidden' : ''}`}>
                                <div className="flex items-start">
                                    <img
                                        src={`data: image / png; base64, ${selectedClub?.logo_image ? selectedClub?.logo_image : ''}`}
                                        className="w-15 h-15 object-contain rounded"
                                    />
                                    <div className="ml-2 flex flex-col">
                                        <h2 className="text-[#A1A1AA] text-sm uppercase font-semibold">{selectedClub?.abbreviation} ({selectedClub?.foundation_year})</h2>
                                        <h2 className="text-white text-xl font-semibold">{selectedClub?.club_name}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <div className="flex items-center justify-between">
                        <Link to={'/manager/choose-club'} className="mt-auto">
                            <Button className="p-3 w-[7.0rem] bg-transparent border-2 border-[#2A2A35] text-white cursor-pointer hover:bg-[#2A2A35]">
                                <ChevronLeft /> Back
                            </Button>
                        </Link>
                        <Button
                            className="p-3 w-[9.0rem] bg-[#67159C] text-white cursor-pointer hover:bg-[#52107a]"
                            onClick={handleSaveAndContinue}
                            disabled={isSaving || !validateForm()}
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isSaving ? "Saving" : "Create"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </aside>
                <section className="md:w-[80rem] p-10 flex flex-col gap-6 bg-[#19181F] rounded-md">
                    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-[#19181F] text-white border border-[#19181F] gap-2">
                            <TabsTrigger
                                value="personal"
                                className="rounded-none border-b-4 border-b-transparent cursor-pointer hover:border-b-[#67159C] text-white bg-[#19181F] data-[state=active]:border-b-[#67159C] data-[state=active]:bg-transparent data-[state=active]:text-white">
                                Personal Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="attributes"
                                className="rounded-none border-b-4 border-b-transparent cursor-pointer hover:border-b-[#67159C] text-white bg-[#19181F] data-[state=active]:border-b-[#67159C] data-[state=active]:bg-transparent data-[state=active]:text-white">
                                Attributes
                            </TabsTrigger>
                            <TabsTrigger
                                value="tactical"
                                className="rounded-none border-b-4 border-b-transparent cursor-pointer hover:border-b-[#67159C] text-white bg-[#19181F] data-[state=active]:border-b-[#67159C] data-[state=active]:bg-transparent data-[state=active]:text-white">
                                Tactical Style
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="personal" className="mt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-white">First Name</Label>
                                    <Input
                                        id="firstName"
                                        maxLength={10}
                                        value={managerData.personalDetails.firstName}
                                        onChange={(e) => updatePersonalDetails({ firstName: e.target.value })}
                                        className="bg-[#19181F] text-white border-[#2A2A35]"
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-white">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        maxLength={15}
                                        value={managerData.personalDetails.lastName}
                                        onChange={(e) => updatePersonalDetails({ lastName: e.target.value })}
                                        className="bg-[#19181F] text-white border-[#2A2A35]"
                                        placeholder="Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob" className="text-white">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        max={new Date("1990-01-01").toISOString().split("T")[0]}
                                        value={managerData.personalDetails.dateOfBirth}
                                        onChange={(e) => updatePersonalDetails({ dateOfBirth: e.target.value })}
                                        className="bg-[#19181F] text-white border-[#2A2A35]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender" className="text-white">Gender</Label>
                                    <Select
                                        value={managerData.personalDetails.gender}
                                        onValueChange={(value: "male" | "female") => updatePersonalDetails({ gender: value })}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nationality" className="text-white">Nationality</Label>
                                    <Select
                                        value={managerData.personalDetails.nationalityId?.toString() || ''}
                                        onValueChange={(value) => updatePersonalDetails({ nationalityId: Number(value), cityOfBirthId: undefined })}
                                        disabled={isLoadingNations}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder={isLoadingNations ? "Loading nations..." : "Select nationality"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            {nations.map((nation) => (
                                                <SelectItem key={nation?.nation_name} value={nation?.nation_id.toString()}>
                                                    {nation?.nation_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cityOfBirth" className="text-white">City of Birth</Label>
                                    <Select
                                        value={managerData.personalDetails.cityOfBirthId?.toString() || ''}
                                        onValueChange={(value) => updatePersonalDetails({ cityOfBirthId: Number(value) })}
                                        disabled={!managerData.personalDetails.nationalityId || isLoadingCities}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder={isLoadingCities ? "Loading cities..." : "Select city"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            {cities.length > 0 ? (
                                                cities.map((city) => (
                                                    <SelectItem key={city.id} value={city.id.toString()}>
                                                        {city.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-cities" disabled>No cities available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="playingCareer" className="text-white">Playing Career</Label>
                                    <Select
                                        value={managerData.personalDetails.playingCareer}
                                        onValueChange={(value: "none" | "amateur" | "semi-pro" | "pro") => updatePersonalDetails({ playingCareer: value })}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder="Select playing career level" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="amateur">Amateur Footballer</SelectItem>
                                            <SelectItem value="semi-pro">Semi-Professional Footballer</SelectItem>
                                            <SelectItem value="pro">Professional Footballer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="attributes" className="mt-6 space-y-6">
                            <p className="text-sm text-[#A1A1AA] mb-4">
                                Points Used: <span className="font-bold text-[#67159C]">{totalUsedPoints}</span> / {allowedPoints}
                                {" "} (<span className="font-bold text-white">Remaining: {allowedPoints - totalUsedPoints}</span>)
                            </p>
                            <ScrollArea className="h-[30rem] pr-4 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-medium text-white border-b border-[#3b3e4e] pb-2">Coaching</h4>
                                        <AttributeSlider
                                            label="Attacking"
                                            value={managerData.attributes.coaching.attacking}
                                            onChange={(val) => updateAttributes('coaching', { attacking: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Defending"
                                            value={managerData.attributes.coaching.defending}
                                            onChange={(val) => updateAttributes('coaching', { defending: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Fitness"
                                            value={managerData.attributes.coaching.fitness}
                                            onChange={(val) => updateAttributes('coaching', { fitness: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Goalkeeping"
                                            value={managerData.attributes.coaching.goalkeeping}
                                            onChange={(val) => updateAttributes('coaching', { goalkeeping: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Tactical"
                                            value={managerData.attributes.coaching.tactical}
                                            onChange={(val) => updateAttributes('coaching', { tactical: val[0] })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-medium text-white border-b border-[#3b3e4e] pb-2">Scouting</h4>
                                        <AttributeSlider
                                            label="Judging Ability"
                                            value={managerData.attributes.scouting.judgingAbility}
                                            onChange={(val) => updateAttributes('scouting', { judgingAbility: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Judging Potential"
                                            value={managerData.attributes.scouting.judgingPotential}
                                            onChange={(val) => updateAttributes('scouting', { judgingPotential: val[0] })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-medium text-white border-b border-[#3b3e4e] pb-2">Mental</h4>
                                        <AttributeSlider
                                            label="Negotiation"
                                            value={managerData.attributes.mental.negotiation}
                                            onChange={(val) => updateAttributes('mental', { negotiation: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Man Management"
                                            value={managerData.attributes.mental.manManagement}
                                            onChange={(val) => updateAttributes('mental', { manManagement: val[0] })}
                                        />
                                        <AttributeSlider
                                            label="Discipline"
                                            value={managerData.attributes.mental.discipline}
                                            onChange={(val) => updateAttributes('mental', { discipline: val[0] })}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="h-0 w-0" />
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="tactical" className="mt-6 space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">Tactical Preferences</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="formation" className="text-white">Preferred Formation</Label>
                                    <Select
                                        value={managerData.tacticalStyle.formationPreference?.toString() || ''}
                                        onValueChange={(value) => updateTacticalStyle({ formationPreference: Number(value) })}
                                        disabled={isLoadingTacticalData}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder={isLoadingTacticalData ? "Loading formations..." : "Select formation"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            {tacticalFormations && tacticalFormations.length > 0 ? (
                                                tacticalFormations?.map((formation) => (
                                                    <SelectItem key={formation.id} value={formation.id.toString()}>
                                                        {formation.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-formations" disabled>No formations available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="playingStyle" className="text-white">Playing Style</Label>
                                    <Select
                                        value={managerData.tacticalStyle.playingStyle?.toString() || ''}
                                        onValueChange={(value) => updateTacticalStyle({ playingStyle: Number(value) })}
                                        disabled={isLoadingTacticalData}
                                    >
                                        <SelectTrigger className="w-full bg-[#19181F] text-white border-[#2A2A35]">
                                            <SelectValue placeholder={isLoadingTacticalData ? "Loading styles..." : "Select playing style"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#19181F] text-white border-[#2A2A35]">
                                            {tacticalTypes && tacticalTypes.length > 0 ? (
                                                tacticalTypes?.map((type) => (
                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-styles" disabled>No styles available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {selectedPlayingStyle && (
                                <div className="p-2 rounded-md w-full border-1 border-[#2A2A35]">
                                    <h2 className="w-full text-center text-xl text-[#A1A1AA]">{selectedPlayingStyle.description}</h2>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </section>
            </Card>
        </main>
    );
};

export default ManagerDetails;