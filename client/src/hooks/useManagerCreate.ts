import { Club } from "@/types/club";
import { Nation } from "@/types/nation";
import { useState, useEffect, useCallback } from "react";
import { getAllNations } from "@/services/api/routes/nationRoutes";
import { getCitiesByNation } from "@/services/api/routes/cityRoutes";
import { ManagerData, ManagerPersonalDetails, ManagerAttributes, TacticalStyle, City } from "@/types/manager";

export function useManagerCreation() {
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
                attack: 5, defence: 5, fitness: 5, goalkeeping: 5, tactical: 5, technical: 5, mental: 5,
            },
            mental: {
                adaptability: 5, determination: 5, peopleManagement: 5, motivating: 5, scouting: 5, negotiation: 5, judgement: 5,
            },
            knowledge: {
                youthDevelopment: 5, manManagement: 5, financial: 5, medical: 5, transferMarket: 5,
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

    const updateAttributes = useCallback((category: keyof ManagerAttributes, attrs: Partial<ManagerAttributes[typeof category]>) => {
        setManagerData(prev => ({
            ...prev,
            attributes: {
                ...prev.attributes,
                [category]: { ...prev.attributes[category], ...attrs }
            }
        }));
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
    };
}