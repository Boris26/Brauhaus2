import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {IngredientEditDialog, IngredientKind} from "./IngredientEditDialog";

const records = {
    malt: {id: 7, name: "Pilsener", description: "Hell", ebc: 3},
    hop: {id: 17, name: "Styrian Golding", description: "", type: "Aromahopfen", alpha: 0},
    yeast: {id: 23, name: "M41", description: "", type: "Obergärig", evg: 75, temperature: 18},
    additional: {id: 9, name: "Koriander", description: "Samen"},
};
const renderDialog = (kind: IngredientKind, overrides = {}) => {
    const onSave = jest.fn(); const onCancel = jest.fn();
    render(<IngredientEditDialog kind={kind} value={records[kind]} open loading={false} onSave={onSave} onCancel={onCancel} {...overrides}/>);
    return {onSave, onCancel};
};

describe("IngredientEditDialog", () => {
    it.each([["malt", "EBC", "3"], ["hop", "Typ", "Aromahopfen"], ["hop", "Alpha %", "0"], ["yeast", "EVG %", "75"], ["yeast", "Temperatur °C", "18"], ["yeast", "Typ", "Obergärig"], ["additional", "Beschreibung", "Samen"]] as const)("prefills %s %s", (kind, label, expected) => {
        renderDialog(kind); expect(screen.getByLabelText(label)).toHaveValue(expected);
    });
    it("keeps the master id and submits numeric values", () => {
        const {onSave} = renderDialog("hop");
        fireEvent.change(screen.getByLabelText("Alpha %"), {target: {value: "3.2"}});
        fireEvent.click(screen.getByText("Speichern"));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({id: 17, alpha: 3.2, type: "Aromahopfen"}));
    });
    it("blocks blank names and invalid numeric values", () => {
        const {onSave} = renderDialog("malt");
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "  "}});
        fireEvent.change(screen.getByLabelText("EBC"), {target: {value: "not-a-number"}});
        fireEvent.click(screen.getByText("Speichern"));
        expect(onSave).not.toHaveBeenCalled(); expect(screen.getByText("Name ist erforderlich.")).toBeInTheDocument();
    });
    it("does not save on cancel and disables actions while loading", () => {
        const {onSave, onCancel} = renderDialog("additional");
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Neu"}}); fireEvent.click(screen.getByText("Abbrechen"));
        expect(onCancel).toHaveBeenCalled(); expect(onSave).not.toHaveBeenCalled();
        renderDialog("additional", {loading: true});
        expect(screen.getAllByText("Abbrechen").at(-1)).toBeDisabled();
        expect(screen.getAllByText("Speichern").at(-1)?.closest("button")).toBeDisabled();
    });
    it("shows a friendly backend conflict and preserves values", () => {
        renderDialog("hop", {backendError: "Eine Zutat mit diesem Namen existiert bereits."});
        expect(screen.getByText("Eine Zutat mit diesem Namen existiert bereits.")).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toHaveValue("Styrian Golding");
    });
});
