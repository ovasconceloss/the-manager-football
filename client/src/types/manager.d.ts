export type ManagerPersonalDetails = {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationalityId: number | undefined;
    cityOfBirthId: number | undefined;
    playingCareer: 'none' | 'amateur' | 'semi-pro' | 'pro';
    gender: 'male' | 'female' | 'other';
    image: string | undefined;
};

export type ManagerAttributes = {
    coaching: {
        attack: number;
        defence: number;
        fitness: number;
        goalkeeping: number;
        tactical: number;
        technical: number;
        mental: number;
    };
    mental: {
        adaptability: number;
        determination: number;
        peopleManagement: number;
        motivating: number;
        scouting: number;
        negotiation: number;
        judgement: number;
    };
    knowledge: {
        youthDevelopment: number;
        manManagement: number;
        financial: number;
        medical: number;
        transferMarket: number;
    };
};

export type TacticalStyle = {
    formationPreference: string;
    playingStyle: 'possession' | 'counter_attack' | 'tiki_taka' | 'direct_play' | 'gegenpress';
    trainingFocus: 'attacking' | 'defensive' | 'technical' | 'physical' | 'balanced';
};

export type ManagerData = {
    personalDetails: ManagerPersonalDetails;
    attributes: ManagerAttributes;
    tacticalStyle: TacticalStyle;
};

export type City = {
    id: number;
    name: string;
    nation_id: number;
};