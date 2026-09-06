import React from 'react';
import {Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField} from '@mui/material';
import AppDialog from '../../components/AppDialog/AppDialog';
import {IngredientMappingRequest, IngredientResolution, IngredientType, JsonObject, RecipeImportFormat, RecipeImportRequest, RecipeImportResult} from '../../model/RecipeImport';
import {createImportIdempotencyKey} from '../../utils/recipeImport';
import './RecipeImportDialog.css';

export interface ImportMasterIngredient { id: string | number; name: string; }
export type ImportMasterData = Record<IngredientType, ImportMasterIngredient[]>;

interface RecipeImportDialogProps {
    open: boolean;
    loading?: boolean;
    backendError?: string;
    result?: RecipeImportResult;
    masterData?: ImportMasterData;
    onCancel: () => void;
    onImport: (request: RecipeImportRequest) => void;
    onCreateMasterData?: (type: IngredientType, values: Record<string, string | number>) => Promise<ImportMasterIngredient>;
}

const typeLabel: Record<IngredientType, string> = {MALT: 'Malz', HOP: 'Hopfen', YEAST: 'Hefe', ADDITIONAL_INGREDIENT: 'Weitere Zutat'};
const keyFor = (ingredient: IngredientResolution) => `${ingredient.ingredientType}:${ingredient.sourceName}`;

export const RecipeImportDialog: React.FC<RecipeImportDialogProps> = ({open, loading = false, backendError, result, masterData = {MALT: [], HOP: [], YEAST: [], ADDITIONAL_INGREDIENT: []}, onCancel, onImport, onCreateMasterData}) => {
    const [format, setFormat] = React.useState<RecipeImportFormat | ''>('');
    const [fileName, setFileName] = React.useState('');
    const [recipe, setRecipe] = React.useState<JsonObject>();
    const [idempotencyKey, setIdempotencyKey] = React.useState('');
    const [parseError, setParseError] = React.useState('');
    const [submitted, setSubmitted] = React.useState(false);
    const [mappings, setMappings] = React.useState<Record<string, string | number>>({});
    const [creating, setCreating] = React.useState<string>();
    const [createValues, setCreateValues] = React.useState<Record<string, string | number>>({name: '', description: ''});
    const [createError, setCreateError] = React.useState('');
    const wasOpen = React.useRef(open);

    const reset = React.useCallback(() => {
        setFormat(''); setFileName(''); setRecipe(undefined); setIdempotencyKey(''); setParseError('');
        setSubmitted(false); setMappings({}); setCreating(undefined); setCreateValues({name: '', description: ''}); setCreateError('');
    }, []);
    React.useEffect(() => { if (open && !wasOpen.current) reset(); wasOpen.current = open; }, [open, reset]);
    React.useEffect(() => { if (result?.resolutionRequired) setSubmitted(false); }, [result]);

    const resetAndCancel = () => { reset(); onCancel(); };
    const readFile = async (file?: File) => {
        setFileName(file?.name || ''); setRecipe(undefined); setIdempotencyKey(''); setParseError(''); setSubmitted(false); setMappings({});
        if (!file) return;
        try {
            const parsed: unknown = JSON.parse(await file.text());
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { setParseError('Die JSON-Datei muss ein Objekt enthalten.'); return; }
            setRecipe(parsed as JsonObject); setIdempotencyKey(createImportIdempotencyKey());
        } catch (_error) { setParseError('Die ausgewählte Datei enthält kein gültiges JSON.'); }
    };
    const unresolved = result?.resolutionRequired ? (result.ingredients ?? []) : [];
    const retry = () => {
        if (!format || !recipe || !idempotencyKey || unresolved.some(item => mappings[keyFor(item)] == null || mappings[keyFor(item)] === '')) return;
        const ingredientMappings: IngredientMappingRequest[] = unresolved.map(item => ({ingredientType: item.ingredientType, sourceName: item.sourceName, ingredientId: mappings[keyFor(item)]}));
        setSubmitted(true); onImport({format, recipe, idempotencyKey, ingredientMappings});
    };
    const startCreate = (item: IngredientResolution) => {
        setCreating(keyFor(item)); setCreateError(''); setCreateValues({name: item.sourceName, description: ''});
    };
    const create = async (item: IngredientResolution) => {
        try {
            if (!onCreateMasterData) throw new Error('Master-data creation is not configured');
            const created = await onCreateMasterData(item.ingredientType, createValues);
            setMappings(current => ({...current, [keyFor(item)]: created.id})); setCreating(undefined); setCreateError('');
        } catch (_error) { setCreateError('Die Stammdaten-Zutat konnte nicht angelegt werden.'); }
    };
    const resolutionComplete = unresolved.length > 0 && unresolved.every(item => mappings[keyFor(item)] != null && mappings[keyFor(item)] !== '');
    const busy = loading || Boolean(creating && submitted);

    return <AppDialog open={open} onClose={resetAndCancel} disableClose={busy} title={unresolved.length ? 'Zutaten zuordnen' : 'Rezept importieren'} variant={backendError && submitted ? 'error' : busy ? 'progress' : 'info'} className="recipe-import-dialog"
        actions={<><Button className="recipe-import-dialog__cancel-button" onClick={resetAndCancel} disabled={busy}>Abbrechen</Button>
            {unresolved.length ? <Button className="recipe-import-dialog__import-button" onClick={retry} color="primary" variant="contained" disabled={!resolutionComplete || busy}>{loading ? <><CircularProgress size={18}/>&nbsp;Import abschließen…</> : 'Import abschließen'}</Button>
            : <Button className="recipe-import-dialog__import-button" onClick={() => { if (format && recipe && idempotencyKey) { setSubmitted(true); onImport({format, recipe, idempotencyKey}); } }} color="primary" variant="contained" disabled={!format || !recipe || !idempotencyKey || !!parseError || loading}>{loading ? <><CircularProgress size={18}/>&nbsp;Importieren…</> : 'Importieren'}</Button>}</>}>
        {unresolved.length ? <div className="recipe-import-dialog__resolutions" aria-label="Nicht eindeutig zugeordnete Zutaten">
            <p>Bitte ordne jede problematische Import-Zutat ausdrücklich lokalen Stammdaten zu.</p>
            {unresolved.map(item => { const key = keyFor(item); const options = [...item.candidates, ...masterData[item.ingredientType].filter(master => !item.candidates.some(candidate => String(candidate.ingredientId) === String(master.id))).map(master => ({ingredientId: master.id, name: master.name, matchType: 'UNKNOWN' as const}))]; return <section className="recipe-import-dialog__resolution" key={key}>
                <strong>{typeLabel[item.ingredientType]}</strong><div>Importwert: „{item.sourceName}“</div>
                <FormControl fullWidth margin="dense"><InputLabel id={`${key}-label`}>Lokale Zuordnung</InputLabel><Select labelId={`${key}-label`} label="Lokale Zuordnung" value={String(mappings[key] ?? '')} onChange={event => setMappings(current => ({...current, [key]: event.target.value}))}><MenuItem value=""><em>Bitte bewusst auswählen</em></MenuItem>{options.map(option => <MenuItem key={option.ingredientId} value={String(option.ingredientId)}>{option.name}{option.matchType === 'FUZZY' ? ' (ähnlich)' : ''}</MenuItem>)}</Select></FormControl>
                {creating === key ? <div className="recipe-import-dialog__create"><TextField label="Name" value={createValues.name} onChange={event => setCreateValues(v => ({...v, name: event.target.value}))}/><TextField label="Beschreibung" value={createValues.description} onChange={event => setCreateValues(v => ({...v, description: event.target.value}))}/>{item.ingredientType === 'MALT' && <TextField label="EBC" type="number" value={createValues.ebc ?? ''} onChange={event => setCreateValues(v => ({...v, ebc: Number(event.target.value)}))}/>} {item.ingredientType === 'HOP' && <><TextField label="Typ" value={createValues.type ?? ''} onChange={event => setCreateValues(v => ({...v, type: event.target.value}))}/><TextField label="Alpha (%)" type="number" value={createValues.alpha ?? ''} onChange={event => setCreateValues(v => ({...v, alpha: Number(event.target.value)}))}/></>} {item.ingredientType === 'YEAST' && <><TextField label="Typ" value={createValues.type ?? ''} onChange={event => setCreateValues(v => ({...v, type: event.target.value}))}/><TextField label="EVG (%)" type="number" value={createValues.evg ?? ''} onChange={event => setCreateValues(v => ({...v, evg: Number(event.target.value)}))}/><TextField label="Temperatur (°C)" type="number" value={createValues.temperature ?? ''} onChange={event => setCreateValues(v => ({...v, temperature: Number(event.target.value)}))}/></>}<Button onClick={() => void create(item)} disabled={!String(createValues.name ?? '').trim()}>Anlegen und zuordnen</Button>{createError && <p role="alert" className="recipe-import-dialog__error">{createError}</p>}</div> : <Button onClick={() => startCreate(item)}>Neue Zutat anlegen</Button>}
            </section>; })}
        </div> : <><FormControl className="recipe-import-dialog__format" fullWidth margin="normal"><InputLabel id="recipe-import-format-label">Importformat</InputLabel><Select labelId="recipe-import-format-label" label="Importformat" value={format} disabled={loading} MenuProps={{PaperProps: {className: 'recipe-import-dialog__menu'}}} onChange={(event: SelectChangeEvent) => { setFormat(event.target.value as RecipeImportFormat); if (recipe) setIdempotencyKey(createImportIdempotencyKey()); }}><MenuItem value={RecipeImportFormat.BRAUHAUS}>Brauhaus</MenuItem><MenuItem value={RecipeImportFormat.MMUM}>MaischeMalzundMehr (MMuM)</MenuItem></Select></FormControl><Button className="recipe-import-dialog__file-button" component="label" variant="outlined" fullWidth disabled={loading}>{fileName || 'Datei auswählen'}<input hidden type="file" accept=".json,application/json" onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }}/></Button></>}
        {parseError && <p className="recipe-import-dialog__error" role="alert">{parseError}</p>}{backendError && submitted && <p className="recipe-import-dialog__error" role="alert">{backendError}</p>}
    </AppDialog>;
};
