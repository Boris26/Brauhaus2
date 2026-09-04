import React from 'react';
import {Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import AppDialog from '../../components/AppDialog/AppDialog';
import {JsonObject, RecipeImportFormat, RecipeImportRequest} from '../../model/RecipeImport';
import {createImportIdempotencyKey} from '../../utils/recipeImport';
import './RecipeImportDialog.css';

interface RecipeImportDialogProps {
    open: boolean;
    loading?: boolean;
    backendError?: string;
    onCancel: () => void;
    onImport: (request: RecipeImportRequest) => void;
}

export const RecipeImportDialog: React.FC<RecipeImportDialogProps> = ({open, loading = false, backendError, onCancel, onImport}) => {
    const [format, setFormat] = React.useState<RecipeImportFormat | ''>('');
    const [fileName, setFileName] = React.useState('');
    const [recipe, setRecipe] = React.useState<JsonObject>();
    const [idempotencyKey, setIdempotencyKey] = React.useState('');
    const [parseError, setParseError] = React.useState('');
    const [submitted, setSubmitted] = React.useState(false);
    const wasOpen = React.useRef(open);

    React.useEffect(() => {
        if (open && !wasOpen.current) {
            setFormat('');
            setFileName('');
            setRecipe(undefined);
            setIdempotencyKey('');
            setParseError('');
            setSubmitted(false);
        }
        wasOpen.current = open;
    }, [open]);

    const resetAndCancel = () => {
        setFormat('');
        setFileName('');
        setRecipe(undefined);
        setIdempotencyKey('');
        setParseError('');
        setSubmitted(false);
        onCancel();
    };

    const readFile = async (file?: File) => {
        setFileName(file?.name || '');
        setRecipe(undefined);
        setIdempotencyKey('');
        setParseError('');
        setSubmitted(false);
        if (!file) return;
        try {
            const parsed: unknown = JSON.parse(await file.text());
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                setParseError('Die JSON-Datei muss ein Objekt enthalten.');
                return;
            }
            setRecipe(parsed as JsonObject);
            setIdempotencyKey(createImportIdempotencyKey());
        } catch (_error) {
            setParseError('Die ausgewählte Datei enthält kein gültiges JSON.');
        }
    };

    const canImport = Boolean(format && recipe && idempotencyKey && !parseError && !loading);

    return (
        <AppDialog open={open} onClose={resetAndCancel} disableClose={loading} title="Rezept importieren" variant={backendError && submitted ? 'error' : loading ? 'progress' : 'info'} className="recipe-import-dialog"
            actions={<>
                <Button className="recipe-import-dialog__cancel-button" onClick={resetAndCancel} disabled={loading}>Abbrechen</Button>
                <Button className="recipe-import-dialog__import-button" onClick={() => {
                    if (format && recipe && idempotencyKey) { setSubmitted(true); onImport({format, recipe, idempotencyKey}); }
                }} color="primary" variant="contained" disabled={!canImport}>
                    {loading ? <><CircularProgress size={18} />&nbsp;Importieren…</> : 'Importieren'}
                </Button>
            </>}>
                <FormControl className="recipe-import-dialog__format" fullWidth margin="normal">
                    <InputLabel id="recipe-import-format-label">Importformat</InputLabel>
                    <Select labelId="recipe-import-format-label" label="Importformat" value={format} disabled={loading}
                        MenuProps={{PaperProps: {className: 'recipe-import-dialog__menu'}}}
                        onChange={(event: SelectChangeEvent) => {
                            setFormat(event.target.value as RecipeImportFormat);
                            if (recipe) setIdempotencyKey(createImportIdempotencyKey());
                        }}>
                        <MenuItem value={RecipeImportFormat.BRAUHAUS}>Brauhaus</MenuItem>
                        <MenuItem value={RecipeImportFormat.MMUM}>MaischeMalzundMehr (MMuM)</MenuItem>
                    </Select>
                </FormControl>
                <Button className="recipe-import-dialog__file-button" component="label" variant="outlined" fullWidth disabled={loading}>
                    {fileName || 'Datei auswählen'}
                    <input hidden type="file" accept=".json,application/json"
                        onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ''; }} />
                </Button>
                {parseError && <p className="recipe-import-dialog__error" role="alert">{parseError}</p>}
                {backendError && submitted && <p className="recipe-import-dialog__error" role="alert">{backendError}</p>}
        </AppDialog>
    );
};
