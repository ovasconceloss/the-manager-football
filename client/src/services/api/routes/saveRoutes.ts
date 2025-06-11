import axiosClient from "../config/axiosConfig";

export const listSaves = async () => {
    try {
        const response = await axiosClient.get('/save/list');
        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failure to list all available saves" };
    }
}

export const createSave = async () => {
    try {
        await axiosClient.post('/save/create')
        return { success: true, message: "New save successfully created!" }
    } catch (err: unknown) {
        return { success: false, message: "Failed to create new save. Please try again." };
    }
}

export const loadSave = async (filename: string) => {
    try {
        await axiosClient.post('/save/load', { filename: filename });
        return { success: true, message: "Save successfully loaded" }
    } catch (err: unknown) {
        return { success: false, message: "Failed to load a save. Please try again." };
    }
}

export const deleteSave = async (filename: string) => {
    try {
        await axiosClient.post('/save/delete', { filename: filename });
        return { success: true, message: "Save successfully deleted" }
    } catch (err: unknown) {
        return { success: false, message: "Failed to delete a save file. Please try again." };
    }
}