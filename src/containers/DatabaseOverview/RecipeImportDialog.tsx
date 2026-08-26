import React from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {RecipeImportRequest, RecipeImportSource} from '../../model/RecipeImport';

interface RecipeImportDialogProps {
    open: boolean;
    onCancel: () => void;
    onImport: (request: RecipeImportRequest) => void;
}

export const RecipeImportDialog: React.FC<RecipeImportDialogProps> = ({open, onCancel, onImport}) => {
    const [source, setSource] = React.useState<RecipeImportSource | ''>('');
    const [file, setFile] = React.useState<File>();
    const [error, setError] = React.useState('');

    const resetAndCancel = () => {
        setSource('');
        setFile(undefined);
        setError('');
        onCancel();
    };

    const handleImport = async () => {
        if (!source) {
            setError('Bitte wählen Sie eine Rezeptquelle aus.');
            return;
        }
        if (!file) {
            setError('Bitte wählen Sie eine JSON-Datei aus.');
            return;
        }

        try {
            const recipe: unknown = JSON.parse(await file.text());
            onImport({source, recipe});
            setSource('');
            setFile(undefined);
            setError('');
        } catch (_error) {
            setError('Die ausgewählte Datei enthält kein gültiges JSON.');
        }
    };

    return (
        <Dialog open={open} onClose={resetAndCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Rezept importieren</DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="normal">
                    <InputLabel id="recipe-import-source-label">Quelle</InputLabel>
                    <Select
                        labelId="recipe-import-source-label"
                        label="Quelle"
                        value={source}
                        onChange={(event: SelectChangeEvent) => {
                            setSource(event.target.value as RecipeImportSource);
                            setError('');
                        }}
                    >
                        <MenuItem value={RecipeImportSource.MAISCHE_MALZ_UND_MEHR}>MaischeMalzundMehr</MenuItem>
                        <MenuItem value={RecipeImportSource.BRAUREKA}>BräuReKa / Müggelland</MenuItem>
                        <MenuItem value={RecipeImportSource.BRAUHAUS}>Brauhaus</MenuItem>
                    </Select>
                </FormControl>
                <Button component="label" variant="outlined" fullWidth>
                    {file ? file.name : 'JSON-Datei auswählen'}
                    <input
                        hidden
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => {
                            setFile(event.target.files?.[0]);
                            setError('');
                            event.target.value = '';
                        }}
                    />
                </Button>
                {error && <p role="alert">{error}</p>}
            </DialogContent>
            <DialogActions>
                <Button onClick={resetAndCancel}>Abbrechen</Button>
                <Button onClick={handleImport} variant="contained">Import starten</Button>
            </DialogActions>
        </Dialog>
    );
};
