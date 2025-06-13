import { Club } from "@/types/club";
import { Nation } from "@/types/nation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAllNations } from "@/services/api/routes/nationRoutes";
import { getCitiesByNation } from "@/services/api/routes/cityRoutes";
import { ManagerData, ManagerPersonalDetails, ManagerAttributes, TacticalStyle, City } from "@/types/manager";

export function useManagerCreation() {
    const MAX_ATTRIBUTE_POINTS: Record<ManagerPersonalDetails['playingCareer'], number> = {
        none: 60,
        amateur: 80,
        'semi-pro': 100,
        pro: 120,
    };

    const [selectedClub, setSelectedClub] = useState<Club | undefined>();
    const [managerData, setManagerData] = useState<ManagerData>({
        personalDetails: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            nationalityId: undefined,
            cityOfBirthId: undefined,
            playingCareer: 'none',
            gender: 'male',
            image: undefined,
        },
        attributes: {
            coaching: {
                attacking: 5, defending: 5, fitness: 5, goalkeeping: 5, tactical: 5,
            },
            scouting: {
                judgingAbility: 5, judgingPotential: 5,
            },
            mental: {
                negotiation: 5, manManagement: 5, discipline: 5,
            }
        },
        tacticalStyle: {
            formationPreference: '',
            playingStyle: 'possession',
            trainingFocus: 'balanced',
        },
    });

    const [isSaving, setIsSaving] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [nations, setNations] = useState<Nation[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingNations, setIsLoadingNations] = useState(true);

    const allowedPoints = useMemo(() => {
        return MAX_ATTRIBUTE_POINTS[managerData.personalDetails.playingCareer];
    }, [managerData.personalDetails.playingCareer]);

    const totalUsedPoints = useMemo(() => {
        const { coaching, scouting, mental } = managerData.attributes;
        let total = 0;

        total += coaching.attacking;
        total += coaching.defending;
        total += coaching.fitness;
        total += coaching.goalkeeping;
        total += coaching.tactical;
        total += scouting.judgingAbility;
        total += scouting.judgingPotential;
        total += mental.negotiation;
        total += mental.manManagement;
        total += mental.discipline;
        return total;
    }, [managerData.attributes]);

    useEffect(() => {
        const managerClub = localStorage.getItem("manager_club");

        if (managerClub) {
            setSelectedClub(JSON.parse(managerClub));
        }
    }, []);

    useEffect(() => {
        const fetchNations = async () => {
            setIsLoadingNations(true);
            try {
                const response = await getAllNations();
                if (response.success && response.response?.data.nations) {
                    setNations(response.response.data.nations);
                } else {
                    console.error("Failed to fetch nations:", response.message);
                }
            } catch (error) {
                console.error("Error fetching nations:", error);
            } finally {
                setIsLoadingNations(false);
            }
        };
        fetchNations();
    }, []);

    useEffect(() => {
        const fetchCities = async () => {
            const nationalityId = managerData.personalDetails.nationalityId;
            if (nationalityId) {
                setIsLoadingCities(true);
                setCities([]);
                try {
                    const response = await getCitiesByNation(nationalityId);
                    if (response.success && response.response?.data.cities) {
                        setCities(response.response.data.cities);
                    } else {
                        console.error("Failed to fetch cities:", response.error);
                    }
                } catch (error) {
                    console.error("Error fetching cities:", error);
                } finally {
                    setIsLoadingCities(false);
                }
            } else {
                setCities([]);
            }
        };
        fetchCities();
    }, [managerData.personalDetails.nationalityId]);

    const updatePersonalDetails = useCallback((details: Partial<ManagerPersonalDetails>) => {
        setManagerData(prev => ({
            ...prev,
            personalDetails: { ...prev.personalDetails, ...details }
        }));
    }, []);

    const updateAttributes = useCallback(<K extends keyof ManagerAttributes>(category: K, attrs: Partial<ManagerAttributes[K]>) => {
        setManagerData(prev => {
            const changedAttrKey = Object.keys(attrs)[0] as keyof Partial<ManagerAttributes[K]>;
            const proposedValue = attrs[changedAttrKey] as number;

            let currentTotalWithoutChange = 0;
            Object.values(prev.attributes.coaching).forEach(val => currentTotalWithoutChange += val);
            Object.values(prev.attributes.scouting).forEach(val => currentTotalWithoutChange += val);
            Object.values(prev.attributes.mental).forEach(val => currentTotalWithoutChange += val);

            const oldValue = prev.attributes[category][changedAttrKey] as number;
            currentTotalWithoutChange -= oldValue;

            const potentialNewTotal = currentTotalWithoutChange + proposedValue;

            const currentAllowedPoints = MAX_ATTRIBUTE_POINTS[prev.personalDetails.playingCareer];

            let finalValueForChangedAttr = proposedValue;

            if (potentialNewTotal > currentAllowedPoints) {
                const excess = potentialNewTotal - currentAllowedPoints;
                finalValueForChangedAttr = Math.max(1, proposedValue - excess);
            }
            return {
                ...prev,
                attributes: {
                    ...prev.attributes,
                    [category]: {
                        ...prev.attributes[category],
                        [changedAttrKey]: finalValueForChangedAttr,
                    },
                },
            };
        });
    }, []);

    const updateTacticalStyle = useCallback((style: Partial<TacticalStyle>) => {
        setManagerData(prev => ({
            ...prev,
            tacticalStyle: { ...prev.tacticalStyle, ...style }
        }));
    }, []);

    const validateForm = useCallback(() => {
        const { personalDetails } = managerData;
        if (!personalDetails.firstName || !personalDetails.lastName || !personalDetails.dateOfBirth || !personalDetails.nationalityId) {
            return false;
        }

        return true;
    }, [managerData]);

    const saveManager = async () => {
        if (!validateForm()) {
            console.error("Form validation failed. Please fill all required fields.");
            return;
        }
        setIsSaving(true);
        try {
            console.log("Saving manager data:", managerData);
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log("Manager saved successfully!");
            return true;
        } catch (error) {
            console.error("Error saving manager:", error);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
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
    };
}