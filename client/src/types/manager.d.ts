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
        attacking: number;
        defending: number;
        fitness: number;
        goalkeeping: number;
        tactical: number;
    };
    scouting: {
        judgingAbility: number;
        judgingPotential: number;
    };
    mental: {
        negotiation: number;
        manManagement: number;
        discipline: number;
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