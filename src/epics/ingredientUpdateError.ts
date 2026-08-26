import axios from "axios";

export const getIngredientUpdateError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) return "Eine Zutat mit diesem Namen existiert bereits.";
        if (error.response?.status === 404) return "Die Zutat wurde nicht gefunden.";
        if (error.response?.status === 400) return "Die eingegebenen Daten sind ungültig.";
    }
    return "Die Zutat konnte nicht aktualisiert werden.";
};
