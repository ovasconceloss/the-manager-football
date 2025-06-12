import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSave } from "@/services/api/routes/saveRoutes";

export function useCreateSave() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateNewSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await createSave();
            if (result.success !== true) {
                setError(result.message);
                setLoading(false);
                return;
            }
            navigate('/manager/choose-club');
        } catch {
            setError("An unexpected error has occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleCreateNewSave, error, loading };
}