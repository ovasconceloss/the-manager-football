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
    formationPreference: number | undefined;
    playingStyle: number | undefined;
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