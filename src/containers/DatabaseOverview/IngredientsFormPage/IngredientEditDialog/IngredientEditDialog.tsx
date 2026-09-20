import React, {useEffect, useState} from "react";
import {Alert, Button, CircularProgress} from "@mui/material";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AppDialog, {DialogCancelButton} from '../../../../components/AppDialog/AppDialog';
import FormField from '../../../../components/FormField/FormField';

export type IngredientKind = "malt" | "hop" | "yeast" | "additional";
export interface IngredientEditValue { id: string | number; name: string; description?: string; ebc?: number; alpha?: number; type?: string; evg?: number; temperature?: number; }

interface Props {
    kind: IngredientKind;
    value: IngredientEditValue | null;
    open: boolean;
    loading: boolean;
    backendError?: string;
    onCancel: () => void;
    onSave: (value: IngredientEditValue) => void;
}

const titles: Record<IngredientKind, string> = {malt: "Malz bearbeiten", hop: "Hopfen bearbeiten", yeast: "Hefe bearbeiten", additional: "Zutat bearbeiten"};

export const IngredientEditDialog = ({kind, value, open, loading, backendError, onCancel, onSave}: Props) => {
    const [form, setForm] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open || !value) return;
        setForm(Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [key, fieldValue == null ? "" : String(fieldValue)])));
        setErrors({});
    }, [open, value]);

    const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm(current => ({...current, [field]: event.target.value}));
        setErrors(current => ({...current, [field]: ""}));
    };
    const numericFields = kind === "malt" ? ["ebc"] : kind === "hop" ? ["alpha"] : kind === "yeast" ? ["evg", "temperature"] : [];
    const submit = () => {
        if (!value || loading) return;
        const nextErrors: Record<string, string> = {};
        if (!form.name?.trim()) nextErrors.name = "Name ist erforderlich.";
        numericFields.forEach(field => {
            if (form[field] === "" || !Number.isFinite(Number(form[field]))) nextErrors[field] = "Bitte eine gültige Zahl eingeben.";
        });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        onSave({...value, ...form, name: form.name.trim(), description: form.description || "", ...Object.fromEntries(numericFields.map(field => [field, Number(form[field])]))});
    };
    const field = (name: string, label: string, numeric = false) => <FormField name={name} label={label} value={form[name] ?? ""} onChange={update(name)} error={errors[name]} type={numeric ? "number" : "text"} step={numeric ? "any" : undefined}/>;

    return <AppDialog open={open} onClose={onCancel} disableClose={loading} title={titles[kind]} variant={backendError ? 'error' : 'info'} icon={<EditOutlinedIcon/>}
        actions={<><DialogCancelButton onClick={onCancel} disabled={loading}/>
            <Button className="brauhaus-button brauhaus-button-primary" color="primary" variant="contained" onClick={submit} disabled={loading} startIcon={!loading ? <SaveOutlinedIcon/> : undefined}>{loading ? <><CircularProgress size={18} sx={{mr: 1}}/>Speichern</> : "Speichern"}</Button></>}>
            {backendError && <Alert severity="error" sx={{mb: 1}}>{backendError}</Alert>}
            <div className="brauhaus-form">{field("name", "Name")}
            {field("description", "Beschreibung")}
            {kind === "malt" && field("ebc", "EBC", true)}
            {kind === "hop" && <>{field("type", "Typ")}{field("alpha", "Alpha %", true)}</>}
            {kind === "yeast" && <>{field("evg", "EVG %", true)}{field("temperature", "Temperatur °C", true)}{field("type", "Typ")}</>}</div>
    </AppDialog>;
};
