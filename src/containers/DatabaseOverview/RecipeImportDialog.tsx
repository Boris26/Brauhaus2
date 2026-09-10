import React from 'react';
import {Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField} from '@mui/material';
import AppDialog from '../../components/AppDialog/AppDialog';
import {IngredientMappingRequest, IngredientResolution, IngredientType, JsonObject, RecipeImportFormat, RecipeImportRequest, RecipeImportResult} from '../../model/RecipeImport';
import {createImportIdempotencyKey} from '../../utils/recipeImport';
import {IngredientId, isValidIngredientId} from '../../utils/ingredientId';
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

interface ResolutionOption {
    id: IngredientId;
    name: string;
    matchType?: string;
    score?: number;
}

const resolutionOptions = (item: IngredientResolution, masterData: ImportMasterData): ResolutionOption[] => {
    const options: ResolutionOption[] = [
        ...item.candidates
            .filter(candidate => isValidIngredientId(candidate.ingredientId))
            .map(candidate => ({id: candidate.ingredientId, name: candidate.name, matchType: candidate.matchType, score: candidate.score})),
        ...masterData[item.ingredientType]
            .filter(master => isValidIngredientId(master.id))
            .map(master => ({id: master.id, name: master.name})),
    ];
    const seen = new Set<string>();
    return options.filter(option => {
        const id = String(option.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
};

const suggestedOption = (item: IngredientResolution, masterData: ImportMasterData): ResolutionOption | undefined => {
    const candidateIds = new Set(item.candidates.filter(candidate => isValidIngredientId(candidate.ingredientId)).map(candidate => String(candidate.ingredientId)));
    const candidates = resolutionOptions(item, masterData).filter(option => candidateIds.has(String(option.id)));
    if (candidates.length === 1) return candidates[0];
    if (candidates.length < 2 || candidates.some(candidate => typeof candidate.score !== 'number' || !Number.isFinite(candidate.score))) return undefined;
    const ranked = [...candidates].sort((left, right) => (right.score as number) - (left.score as number));
    return ranked[0].score! > ranked[1].score! ? ranked[0] : undefined;
};

export const RecipeImportDialog: React.FC<RecipeImportDialogProps> = ({open, loading = false, backendError, result, masterData = {MALT: [], HOP: [], YEAST: [], ADDITIONAL_INGREDIENT: []}, onCancel, onImport, onCreateMasterData}) => {
    const [format, setFormat] = React.useState<RecipeImportFormat | ''>('');
    const [fileName, setFileName] = React.useState('');
    const [recipe, setRecipe] = React.useState<JsonObject>();
    const [idempotencyKey, setIdempotencyKey] = React.useState('');
    const [parseError, setParseError] = React.useState('');
    const [submitted, setSubmitted] = React.useState(false);
    const [mappings, setMappings] = React.useState<Record<string, string | number>>({});
    const [mappingStates, setMappingStates] = React.useState<Record<string, 'suggested' | 'manual' | 'created'>>({});
    const [creating, setCreating] = React.useState<string>();
    const [createValues, setCreateValues] = React.useState<Record<string, string | number>>({name: '', description: ''});
    const [createError, setCreateError] = React.useState('');
    const wasOpen = React.useRef(open);

    const reset = React.useCallback(() => {
        setFormat(''); setFileName(''); setRecipe(undefined); setIdempotencyKey(''); setParseError('');
        setSubmitted(false); setMappings({}); setMappingStates({}); setCreating(undefined); setCreateValues({name: '', description: ''}); setCreateError('');
    }, []);
    React.useEffect(() => { if (open && !wasOpen.current) reset(); wasOpen.current = open; }, [open, reset]);
    React.useEffect(() => {
        if (!result?.resolutionRequired) return;
        const initialMappings: Record<string, string | number> = {};
        const initialStates: Record<string, 'suggested'> = {};
        (result.ingredients ?? []).forEach(item => {
            const suggestion = suggestedOption(item, masterData);
            if (suggestion && isValidIngredientId(suggestion.id)) {
                initialMappings[keyFor(item)] = suggestion.id;
                initialStates[keyFor(item)] = 'suggested';
            }
        });
        setMappings(initialMappings);
        setMappingStates(initialStates);
        setSubmitted(false);
        setCreating(undefined);
    }, [result]); // A new backend response starts a new resolution; ordinary renders retain user choices.

    React.useEffect(() => { if (backendError) setSubmitted(false); }, [backendError]);

    const resetAndCancel = () => { reset(); onCancel(); };
    const readFile = async (file?: File) => {
        setFileName(file?.name || ''); setRecipe(undefined); setIdempotencyKey(''); setParseError(''); setSubmitted(false); setMappings({}); setMappingStates({});
        if (!file) return;
        try {
            const parsed: unknown = JSON.parse(await file.text());
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { setParseError('Die JSON-Datei muss ein Objekt enthalten.'); return; }
            setRecipe(parsed as JsonObject); setIdempotencyKey(createImportIdempotencyKey());
        } catch (_error) { setParseError('Die ausgewählte Datei enthält kein gültiges JSON.'); }
    };
    const unresolved = result?.resolutionRequired ? (result.ingredients ?? []) : [];
    const retry = () => {
        if (!format || !recipe || !idempotencyKey || unresolved.some(item => !isValidIngredientId(mappings[keyFor(item)]))) return;
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
            if (!isValidIngredientId(created.id)) throw new Error('Created master data has no valid id');
            setMappings(current => ({...current, [keyFor(item)]: created.id}));
            setMappingStates(current => ({...current, [keyFor(item)]: 'created'})); setCreating(undefined); setCreateError('');
        } catch (_error) { setCreateError('Die Stammdaten-Zutat konnte nicht angelegt werden.'); }
    };
    const resolvedCount = unresolved.filter(item => isValidIngredientId(mappings[keyFor(item)])).length;
    const missingCount = unresolved.length - resolvedCount;
    const resolutionComplete = unresolved.length > 0 && missingCount === 0;
    const busy = loading || submitted;

    return <AppDialog open={open} onClose={resetAndCancel} disableClose={busy} title={unresolved.length ? 'Zutaten zuordnen' : 'Rezept importieren'} variant={backendError ? 'error' : busy ? 'progress' : 'info'} className="recipe-import-dialog"
        actions={<><Button className="recipe-import-dialog__cancel-button brauhaus-button brauhaus-button-secondary" onClick={resetAndCancel} disabled={busy}>Abbrechen</Button>
            {unresolved.length ? <Button className="recipe-import-dialog__import-button brauhaus-button brauhaus-button-primary" onClick={retry} color="primary" variant="contained" disabled={!resolutionComplete || busy}>{busy ? <><CircularProgress size={18}/>&nbsp;Import abschließen…</> : 'Import abschließen'}</Button>
            : <Button className="recipe-import-dialog__import-button brauhaus-button brauhaus-button-primary" onClick={() => { if (format && recipe && idempotencyKey && !submitted) { setSubmitted(true); onImport({format, recipe, idempotencyKey}); } }} color="primary" variant="contained" disabled={!format || !recipe || !idempotencyKey || !!parseError || busy}>{busy ? <><CircularProgress size={18}/>&nbsp;Importieren…</> : 'Importieren'}</Button>}</>}>
        {unresolved.length ? <div className="recipe-import-dialog__resolutions" aria-label="Nicht eindeutig zugeordnete Zutaten">
            <div className="recipe-import-dialog__resolution-summary" role="status"><strong>{resolvedCount} von {unresolved.length} zugeordnet.</strong>{missingCount > 0 && <span>Noch {missingCount} {missingCount === 1 ? 'Zutat muss' : 'Zutaten müssen'} zugeordnet werden.</span>}</div>
            {unresolved.map(item => { const key = keyFor(item); const options = resolutionOptions(item, masterData); return <section className="recipe-import-dialog__resolution" key={key}>
                <div className="recipe-import-dialog__source"><strong>{typeLabel[item.ingredientType]}</strong><span>„{item.sourceName}“</span></div>
                <div className="recipe-import-dialog__mapping"><FormControl fullWidth size="small"><InputLabel id={`${key}-label`}>Lokale Zuordnung</InputLabel><Select labelId={`${key}-label`} label="Lokale Zuordnung" value={isValidIngredientId(mappings[key]) ? String(mappings[key]) : ''} MenuProps={{PaperProps: {className: 'recipe-import-dialog__menu'}}} onChange={event => { if (isValidIngredientId(event.target.value)) { setMappings(current => ({...current, [key]: event.target.value})); setMappingStates(current => ({...current, [key]: 'manual'})); } }}><MenuItem value=""><em>Bitte auswählen</em></MenuItem>{options.map(option => <MenuItem key={String(option.id)} value={String(option.id)}>{option.name}{option.matchType === 'FUZZY' ? ' (ähnlich)' : ''}</MenuItem>)}</Select></FormControl>
                <span className={`recipe-import-dialog__mapping-status recipe-import-dialog__mapping-status--${mappingStates[key] ?? 'required'}`}>{mappingStates[key] === 'suggested' ? 'Vorschlag' : mappingStates[key] === 'manual' ? 'Manuell gewählt' : mappingStates[key] === 'created' ? 'Neu angelegt' : 'Zuordnung erforderlich'}</span></div>
                {creating === key ? <div className="recipe-import-dialog__create"><TextField label="Name" value={createValues.name} onChange={event => setCreateValues(v => ({...v, name: event.target.value}))}/><TextField label="Beschreibung" value={createValues.description} onChange={event => setCreateValues(v => ({...v, description: event.target.value}))}/>{item.ingredientType === 'MALT' && <TextField label="EBC" type="number" value={createValues.ebc ?? ''} onChange={event => setCreateValues(v => ({...v, ebc: Number(event.target.value)}))}/>} {item.ingredientType === 'HOP' && <><TextField label="Typ" value={createValues.type ?? ''} onChange={event => setCreateValues(v => ({...v, type: event.target.value}))}/><TextField label="Alpha (%)" type="number" value={createValues.alpha ?? ''} onChange={event => setCreateValues(v => ({...v, alpha: Number(event.target.value)}))}/></>} {item.ingredientType === 'YEAST' && <><TextField label="Typ" value={createValues.type ?? ''} onChange={event => setCreateValues(v => ({...v, type: event.target.value}))}/><TextField label="EVG (%)" type="number" value={createValues.evg ?? ''} onChange={event => setCreateValues(v => ({...v, evg: Number(event.target.value)}))}/><TextField label="Temperatur (°C)" type="number" value={createValues.temperature ?? ''} onChange={event => setCreateValues(v => ({...v, temperature: Number(event.target.value)}))}/></>}<Button className="brauhaus-button brauhaus-button-primary" onClick={() => void create(item)} disabled={!String(createValues.name ?? '').trim()}>Anlegen und zuordnen</Button>{createError && <p role="alert" className="recipe-import-dialog__error">{createError}</p>}</div> : <Button className="recipe-import-dialog__create-button brauhaus-button brauhaus-button-secondary" onClick={() => startCreate(item)}>Neue Zutat anlegen</Button>}
            </section>; })}
        </div> : <><FormControl className="recipe-import-dialog__format" fullWidth margin="normal"><InputLabel id="recipe-import-format-label">Importformat</InputLabel><Select labelId="recipe-import-format-label" label="Importformat" value={format} disabled={loading} MenuProps={{PaperProps: {className: 'recipe-import-dialog__menu'}}} onChange={(event: SelectChangeEvent) => { setFormat(event.target.value as RecipeImportFormat); if (recipe) setIdempotencyKey(createImportIdempotencyKey()); }}><MenuItem value={RecipeImportFormat.BRAUHAUS}>Brauhaus</MenuItem><MenuItem value={RecipeImportFormat.MMUM}>MaischeMalzundMehr (MMuM)</MenuItem></Select></FormControl><Button className="recipe-import-dialog__file-button" component="label" variant="outlined" fullWidth disabled={loading}>{fileName || 'Datei auswählen'}<input hidden type="file" accept=".json,application/json" onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }}/></Button></>}
        {parseError && <p className="recipe-import-dialog__error" role="alert">{parseError}</p>}{backendError && <p className="recipe-import-dialog__error" role="alert">{backendError}</p>}
    </AppDialog>;
};
