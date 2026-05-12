import React, { ChangeEvent, FormEvent } from 'react';
import {AdditionalIngredientPhase, AdditionalIngredientTimeUnit, Beer, BeerAdditionalIngredient, FermentationSteps, Hop, Malt, Yeast} from "../../model/Beer";
import {AdditionalIngredientDTO, BeerDTO, HopDTO, MaltDTO, YeastDTO} from "../../model/BeerDTO";
import { HopUsage } from "../../enums/eHopUsage";
import { HopTimeUnit } from "../../enums/eHopTimeUnit";
import { normalizeHopDto, updateHopUsage, validateHopDto } from "./hopDefaults";
import { isValidExecutionMode, normalizeFermentationStep } from "./fermentationDefaults";
import {BeerActions} from "../../actions/actions";
import {connect} from "react-redux";
import {isEqual} from "lodash";
import {
    Typography
} from "@mui/material";
import {MashingType} from "../../enums/eMashingType";
import {RestExecutionMode} from "../../enums/eRestExecutionMode";
import './BeerForm.css'
import SimpleBar from 'simplebar-react';
import {MaltsActions} from "../../actions/malt.actions";
import {HopsActions} from "../../actions/hops.actions";
import {YeastActions} from "../../actions/yeast.actions";
import {AdditionalIngredientsActions} from "../../actions/additionalIngredients.actions";
import {AdditionalIngredient} from "../../model/AdditionalIngredient";
import { COLOR_WHITE, COLOR_BREW_BG, COLOR_ACCENT, BORDER_TRANSPARENT, COLOR_DARK_BG, COLOR_BORDER_INPUT_ALT } from '../../colors';

interface BeerFormProps {
    onSubmitBeer: (beer: BeerDTO) => void;
    getMalt: (isFetching: boolean) => void;
    getHop: (isFetching: boolean) => void;
    getYeast: (isFetching: boolean) => void;
    getAdditionalIngredients: (isFetching: boolean) => void;
    saveBeerFormState: (formState: any) => void;
    malts: Malt[];
    hops: Hop[];
    yeasts: Yeast[];
    additionalIngredients: AdditionalIngredient[];
    isSubmitSuccessful: boolean;
    messageType: string;
    message: string;
    beerFormState?: any;
    beers: Beer[];
    importBeer: (file: File) => void;
    importedBeer?: Beer;
}

interface BeerFormState {
    id: string;
    name: string;
    type: string;
    color: string;
    alcohol: number;
    originalwort: number;
    bitterness: number;
    description: string;
    rating: number;
    mashVolume: number;
    spargeVolume: number;
    cookingTime: number;
    cookingTemperatur: number;
    fermentationSteps: FermentationSteps[];
    maltsDTO: MaltDTO[];
    hopsDTO: HopDTO[];
    yeastsDTO: YeastDTO[];
    additionalIngredientsDTO: AdditionalIngredientDTO[];
    isSubmitSuccessful: boolean;
    missingMalts?: string[];
    missingHops?: string[];
    missingYeasts?: string[];
}

class BeerForm extends React.Component<BeerFormProps, BeerFormState> {
    private fileInput: HTMLInputElement | null | undefined;
    private fixedTypes = ['Einmaischen', 'Abmaischen', 'Kochen'];
    constructor(props: BeerFormProps) {

        super(props);


        const defaultState = {
            id: '0',
            name: '',
            type: '',
            color: '',
            alcohol: 0,
            originalwort: 0,
            bitterness: 0,
            description: '',
            rating: 0,
            mashVolume: 0,
            spargeVolume: 0,
            cookingTime: 0,
            cookingTemperatur: 0,
            fermentationSteps: [
                { type: 'Einmaischen', temperature: 0, time: 0 },
                { type: 'Abmaischen', temperature: 0, time: 0 },
                { type: 'Kochen', temperature: 0, time: 0 }
            ],
            maltsDTO: [{ id: '', name: '', quantity: 0 }],
            hopsDTO: [{ id: '', name: '', quantity: 0, time: 0, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES }],
            yeastsDTO: [{ id: '', name: '', quantity: 0 }],
            additionalIngredientsDTO: [],
            isSubmitSuccessful: false,
        };

        // Wenn ein gespeicherter Formularstatus existiert, verwenden wir diesen, ansonsten den Standardstatus
        this.state = props.beerFormState || defaultState;
    }

    handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        this.setState({[name]: value} as unknown as Pick<BeerFormState, keyof BeerFormState>, () => {
            // Nach jeder Statusänderung den aktuellen Formularstatus speichern
            this.props.saveBeerFormState(this.state);
        });
    };

    componentDidMount() {
        const {getMalt, getHop, getYeast, getAdditionalIngredients} = this.props;
        getMalt(true);
        getHop(true);
        getYeast(true);
        getAdditionalIngredients(true);
    }

    componentDidUpdate(prevProps: Readonly<BeerFormProps>, prevState: Readonly<BeerFormState>, snapshot?: any) {
        const {isSubmitSuccessful, importedBeer} = this.props;
        if (!isEqual(this.state.isSubmitSuccessful,prevState.isSubmitSuccessful)) {
            this.setState({isSubmitSuccessful:isSubmitSuccessful});
        }

        // Wenn importedBeer gesetzt ist und sich geändert hat, Formular mit importierten Daten füllen
        if (importedBeer && importedBeer !== prevProps.importedBeer) {
            this.setState({
                id: importedBeer.id || '0',
                name: importedBeer.name || '',
                type: importedBeer.type || '',
                color: importedBeer.color || '',
                alcohol: importedBeer.alcohol || 0,
                originalwort: importedBeer.originalwort || 0,
                bitterness: importedBeer.bitterness || 0,
                description: importedBeer.description || '',
                rating: importedBeer.rating || 0,
                mashVolume: importedBeer.mashVolume || 0,
                spargeVolume: importedBeer.spargeVolume || 0,
                cookingTime: importedBeer.cookingTime || 0,
                cookingTemperatur: importedBeer.cookingTemperatur || 0,
                // Importierte Rasten werden defensiv normalisiert (Altformat ohne executionMode => TIMED).
                fermentationSteps: importedBeer.fermentation ? importedBeer.fermentation.map((step) => normalizeFermentationStep(step)) : [],
                maltsDTO: importedBeer.malts ? importedBeer.malts.map(m => ({ id: m.id, name: m.name, quantity: m.quantity })) : [],
                // Altrezepte ohne usage/timeUnit bleiben kompatibel und werden auf BOIL/MINUTES normiert.
                hopsDTO: importedBeer.wortBoiling && importedBeer.wortBoiling.hops ? importedBeer.wortBoiling.hops.map(aHop => normalizeHopDto(aHop)) : [],
                yeastsDTO: importedBeer.fermentationMaturation && importedBeer.fermentationMaturation.yeast ? importedBeer.fermentationMaturation.yeast.map(y => ({ id: y.id, name: y.name, quantity: y.quantity })) : [],
                // Alte Rezepte ohne additionalIngredients bleiben kompatibel und werden als leere Liste geführt.
                additionalIngredientsDTO: importedBeer.additionalIngredients ? importedBeer.additionalIngredients.map(aIngredient => this.normalizeAdditionalIngredient(aIngredient)) : [],
                isSubmitSuccessful: false,
            }, () => {
                this.props.saveBeerFormState(this.state);
            });
        }

        if (!isEqual(this.state, prevState)) {
            this.props.saveBeerFormState(this.state);
        }
    }

    handleFermentationStepChange = (value: string, name: string, index: number) => {
       this.setState((prevState) => {
          const fermentationSteps = [...prevState.fermentationSteps];
          const step = fermentationSteps[index];
          // Für TIMED/HOLD ein klares und rückwärtskompatibles Verhalten.
          if (name === "executionMode") {
              step.executionMode = value as RestExecutionMode;
              if (step.executionMode === RestExecutionMode.CONFIRMATION_HOLD) {
                  delete step.time;
              } else if (step.time === undefined) {
                  step.time = 1;
              }
          } else if (name === "temperature" || name === "time") {
              const parsed = Number(value);
              // @ts-ignore
              step[name] = isNaN(parsed) ? undefined : parsed;
          } else {
              // @ts-ignore
              step[name] = value;
          }
          return { fermentationSteps };
       }, () => {
            // Nach jeder Statusänderung den aktuellen Formularstatus speichern
            this.props.saveBeerFormState(this.state);
       });
    };

    getExecutionMode = (step: FermentationSteps) => step.executionMode ?? RestExecutionMode.TIMED;

    validateFermentationSteps = (steps: FermentationSteps[]) => {
        for (const step of steps) {
            const isFixed = this.fixedTypes.includes(step.type);
            if (isFixed) continue;
            const mode = this.getExecutionMode(step);
            // Unbekannte Modi aus Importen nicht stillschweigend akzeptieren.
            if (!isValidExecutionMode(mode)) return false;
            if (step.temperature === undefined || Number(step.temperature) <= 0) return false;
            if (mode === RestExecutionMode.TIMED && (step.time === undefined || Number(step.time) <= 0)) return false;
        }
        return true;
    };

    handleMaltChange = (value: string, name: string, index: number) => {
        this.setState((prevState) => {
            const maltsDTO = [...prevState.maltsDTO];
            const step = maltsDTO[index];
            // @ts-ignore
            step[name] = value;
            return { maltsDTO };
        }, () => {
            // Nach jeder Statusänderung den aktuellen Formularstatus speichern
            this.props.saveBeerFormState(this.state);
        });
    }

    handleHopChange = (aValue: string, aName: string, aIndex: number) => {
        this.setState((prevState) => {
            const hopsDTO = [...prevState.hopsDTO];
            const step = hopsDTO[aIndex];

            if (aName === "usage") {
                hopsDTO[aIndex] = updateHopUsage(step, aValue as HopUsage);
            } else if (aName === "quantity" || aName === "time") {
                // usage/timeUnit wird getrennt geführt; Zeit darf nicht als DRY_HOP-Marker missbraucht werden.
                const parsed = Number(aValue);
                // @ts-ignore
                step[aName] = isNaN(parsed) ? 0 : parsed;
            } else if (aName === "timeUnit") {
                step.timeUnit = aValue as HopTimeUnit;
            } else {
                // @ts-ignore
                step[aName] = aValue;
            }

            return { hopsDTO };
        }, () => {
            this.props.saveBeerFormState(this.state);
        });
    }

    handleYeastChange = (value: string, name: string, index: number) => {
        this.setState((prevState) => {
            const yeastsDTO = [...prevState.yeastsDTO];
            const step = yeastsDTO[index];
            // @ts-ignore
            step[name] = value;
            return { yeastsDTO };
        }, () => {
            // Nach jeder Statusänderung den aktuellen Formularstatus speichern
            this.props.saveBeerFormState(this.state);
        });
    }

    normalizeAdditionalIngredient = (aIngredient: any): AdditionalIngredientDTO => {
        return {
            id: aIngredient?.id,
            name: aIngredient?.name ?? '',
            quantity: Number(aIngredient?.quantity ?? 0),
            unit: aIngredient?.unit ?? 'g',
            phase: Object.values(AdditionalIngredientPhase).includes(aIngredient?.phase)
                ? aIngredient.phase
                : AdditionalIngredientPhase.MATURATION,
            time: aIngredient?.time !== undefined && aIngredient?.time !== null ? Number(aIngredient.time) : undefined,
            timeUnit: Object.values(AdditionalIngredientTimeUnit).includes(aIngredient?.timeUnit)
                ? aIngredient.timeUnit
                : AdditionalIngredientTimeUnit.DAYS,
            description: aIngredient?.description ?? ''
        };
    }

    handleAdditionalIngredientChange = (aValue: string, aName: string, aIndex: number) => {
        this.setState((prevState) => {
            const additionalIngredientsDTO = [...prevState.additionalIngredientsDTO];
            const aStep = additionalIngredientsDTO[aIndex];

            if (aName === "quantity" || aName === "time") {
                const aParsed = Number(aValue);
                // time ist optional; leeres Feld bleibt undefined statt 0 als Marker.
                // @ts-ignore
                aStep[aName] = aValue === '' ? undefined : (isNaN(aParsed) ? 0 : aParsed);
            } else if (aName === "phase") {
                aStep.phase = aValue as AdditionalIngredientPhase;
            } else if (aName === "timeUnit") {
                aStep.timeUnit = aValue as AdditionalIngredientTimeUnit;
            } else if (aName === "name") {
                const aMasterIngredient = this.props.additionalIngredients.find((aIngredient) => aIngredient.name === aValue);
                aStep.name = aValue;
                if (aMasterIngredient) {
                    aStep.id = aMasterIngredient.id;
                }
            } else {
                // @ts-ignore
                aStep[aName] = aValue;
            }

            return { additionalIngredientsDTO };
        }, () => {
            this.props.saveBeerFormState(this.state);
        });
    }

    validateAdditionalIngredients = (aIngredients: AdditionalIngredientDTO[]): boolean => {
        for (const aIngredient of aIngredients) {
            const aHasIdOrName = !!aIngredient.id || !!(aIngredient.name && aIngredient.name.trim().length > 0);
            if (!aHasIdOrName) return false;
            if (!(Number(aIngredient.quantity) > 0)) return false;
            if (!aIngredient.unit || aIngredient.unit.trim().length === 0) return false;
            if (!Object.values(AdditionalIngredientPhase).includes(aIngredient.phase)) return false;
            if (aIngredient.time !== undefined && !(Number(aIngredient.time) > 0)) return false;
            if (aIngredient.timeUnit !== undefined && !Object.values(AdditionalIngredientTimeUnit).includes(aIngredient.timeUnit)) return false;
        }
        return true;
    }



    handleSubmit = (e: FormEvent) => {
        const {malts,hops,yeasts} = this.props;
        e.preventDefault();
        const {
            id,
            name,
            type,
            color,
            alcohol,
            originalwort,
            bitterness,
            description,
            rating,
            mashVolume,
            spargeVolume,
            cookingTime,
            cookingTemperatur,
            fermentationSteps,
            maltsDTO,
            hopsDTO,
            yeastsDTO,
            additionalIngredientsDTO,
        } = this.state;
        if (!this.validateFermentationSteps(fermentationSteps)) {
            alert('Bitte prüfe den Maischeplan: Zeitgesteuerte Rasten benötigen Zeit > 0, Halte-Rasten nur Temperatur.');
            return;
        }

        const malts_DTO = maltsDTO
            .map((aMalt) => {
                const malt = malts.find((malt) => malt.name === aMalt.name);
                if (!malt) return undefined;
                const quantity = aMalt.quantity;
                return { name: malt.name, id: malt.id, quantity: quantity };
            })
            .filter((m): m is MaltDTO => m !== undefined);

        const normalizedHops = hopsDTO.map((aHop) => normalizeHopDto(aHop));
        if (!normalizedHops.every((aHop) => validateHopDto(aHop))) {
            alert('Bitte prüfe die Hopfengaben: Menge und Zeit müssen > 0 sein. Kochhopfen nutzt Minuten, Hopfen stopfen Stunden oder Tage.');
            return;
        }

        const hops_DTO = normalizedHops
            .map((aHop): HopDTO | undefined => {
                const hop = hops.find((hop) => hop.name === aHop.name);
                if (!hop) return undefined;
                const quantity = aHop.quantity;
                const time = aHop.time;
                return {
                    id: hop.id,
                    name: hop.name,
                    quantity,
                    time,
                    usage: aHop.usage,
                    timeUnit: aHop.timeUnit,
                };
            })
            .filter((h): h is HopDTO => h !== undefined);

        const yeasts_DTO = yeastsDTO
            .map((aYeast) => {
                const yeast = yeasts.find((yeast) => yeast.name === aYeast.name);
                if (!yeast) return undefined;
                const quantity = aYeast.quantity;
                return { name: yeast.name, id: yeast.id, quantity: quantity };
            })
            .filter((y): y is YeastDTO => y !== undefined);

        if (!this.validateAdditionalIngredients(additionalIngredientsDTO)) {
            alert('Bitte prüfe weitere Zutaten: Zutat (ID/Name), Menge > 0, Einheit und gültige Phase sind erforderlich. Zeit darf nur > 0 gesetzt werden.');
            return;
        }

        const beer: BeerDTO = {
            id: id || '0',
            name,
            type,
            color,
            alcohol,
            originalwort,
            bitterness,
            description,
            rating,
            mashVolume,
            spargeVolume,
            fermentationSteps,
            cookingTime,
            cookingTemperatur,
            malts: malts_DTO,
            wortBoiling: { totalTime: 0, hops: hops_DTO },
            fermentationMaturation: { fermentationTemperature: 0, carbonation: 0, yeast: yeasts_DTO},
            // additionalIngredients wird 1:1 aus dem Rezepteditor übernommen, damit Import/Load/Save verlustfrei bleibt.
            additionalIngredients: additionalIngredientsDTO
        };

        console.log(beer);
        this.props.onSubmitBeer(beer);
    };

    resetForm = () => {
        this.setState({
            name: '',
            type: '',
            color: '',
            alcohol: 0,
            originalwort: 0,
            bitterness: 0,
            description: '',
            rating: 0,
            mashVolume: 0,
            spargeVolume: 0,
            cookingTime: 0,
            cookingTemperatur: 0,
            fermentationSteps: [],
            maltsDTO: [],
            hopsDTO: [],
            yeastsDTO: [],
            additionalIngredientsDTO: [],
        }, () => {
            // Nach dem Zurücksetzen des Formulars aktualisieren wir den gespeicherten Status
            this.props.saveBeerFormState(this.state);
        });
    };

    addFermentationStep = () => {
        this.setState((prevState) => {
            const rastCount = prevState.fermentationSteps.filter((s) => !Object.values(MashingType).includes(s.type as MashingType) || s.type === '').length + 1;
            return {
                fermentationSteps: [
                    ...prevState.fermentationSteps,
                    { type: `Rast ${rastCount}`, temperature: 0, time: 1, executionMode: RestExecutionMode.TIMED }
                ],
            };
        });
    };

    addMalts = () => {
        this.setState((prevState) => ({
            maltsDTO: [...prevState.maltsDTO, { id: '', name: '', quantity: 0 }],
        }));
    }

    addHops = () => {
        this.setState((prevState) => ({
            hopsDTO: [...prevState.hopsDTO, { id: '', name: '', quantity: 0, time: 0, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES }],
        }));
    }

    addYeast = () => {
        this.setState((prevState) => ({
            yeastsDTO: [...prevState.yeastsDTO, {id: '', name: '', quantity: 0}],
        }));
    }

    addAdditionalIngredient = () => {
        this.setState((prevState) => ({
            additionalIngredientsDTO: [...prevState.additionalIngredientsDTO, {
                quantity: 0,
                unit: 'g',
                phase: AdditionalIngredientPhase.MATURATION,
                time: undefined,
                timeUnit: AdditionalIngredientTimeUnit.DAYS,
                description: ''
            }],
        }));
    }

    removeFermentationStep = (index: number) => {
        this.setState((prevState) => {
            const fermentationSteps = [...prevState.fermentationSteps];
            fermentationSteps.splice(index, 1);
            return { fermentationSteps };
        });
    };

    removeMalts = (index: number) => {
        this.setState((prevState) => {
            const maltsDTO = [...prevState.maltsDTO];
            maltsDTO.splice(index, 1);
            return { maltsDTO };
        });
    }

    removeHops = (index: number) => {
        this.setState((prevState) => {
            const hopsDTO = [...prevState.hopsDTO];
            hopsDTO.splice(index, 1);
            return { hopsDTO };
        });
    }

    removeYeast = (index: number) => {
        this.setState((prevState) => {
            const yeastsDTO = [...prevState.yeastsDTO];
            yeastsDTO.splice(index, 1);
            return { yeastsDTO };
        });
    }

    removeAdditionalIngredient = (aIndex: number) => {
        this.setState((prevState) => {
            const additionalIngredientsDTO = [...prevState.additionalIngredientsDTO];
            additionalIngredientsDTO.splice(aIndex, 1);
            return { additionalIngredientsDTO };
        });
    }

    handleBeerSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const { beers } = this.props;
        const selectedId = e.target.value;
        if (!selectedId) {
            // Formular leeren
            this.resetForm();
            return;
        }
        const selectedBeer = beers.find(b => String(b.id) === selectedId);
        if (selectedBeer) {
            this.setState({
                id: selectedBeer.id || '0',
                name: selectedBeer.name || '',
                type: selectedBeer.type || '',
                color: selectedBeer.color || '',
                alcohol: selectedBeer.alcohol || 0,
                originalwort: selectedBeer.originalwort || 0,
                bitterness: selectedBeer.bitterness || 0,
                description: selectedBeer.description || '',
                rating: selectedBeer.rating || 0,
                mashVolume: selectedBeer.mashVolume || 0,
                spargeVolume: selectedBeer.spargeVolume || 0,
                cookingTime: selectedBeer.cookingTime || 0,
                cookingTemperatur: selectedBeer.cookingTemperatur || 0,
                fermentationSteps: selectedBeer.fermentation ? [...selectedBeer.fermentation] : [],
                maltsDTO: selectedBeer.malts ? selectedBeer.malts.map(m => ({ id: m.id, name: m.name, quantity: m.quantity })) : [],
                // Bestehende Rezepte ohne neue Felder werden im UI als Kochhopfen in Minuten dargestellt.
                hopsDTO: selectedBeer.wortBoiling && selectedBeer.wortBoiling.hops ? selectedBeer.wortBoiling.hops.map(aHop => normalizeHopDto(aHop)) : [],
                yeastsDTO: selectedBeer.fermentationMaturation && selectedBeer.fermentationMaturation.yeast ? selectedBeer.fermentationMaturation.yeast.map(y => ({ id: y.id, name: y.name, quantity: y.quantity })) : [],
                // Für alte DB-Einträge ohne Feld wird bewusst [] gesetzt.
                additionalIngredientsDTO: selectedBeer.additionalIngredients ? selectedBeer.additionalIngredients.map(aIngredient => this.normalizeAdditionalIngredient(aIngredient)) : [],
                isSubmitSuccessful: false,
            }, () => {
                this.props.saveBeerFormState(this.state);
            });
        }
    };

    renderCreateBeerForm() {
        const {maltsDTO, hopsDTO, yeastsDTO, additionalIngredientsDTO, isSubmitSuccessful, name, type, color, alcohol, originalwort, bitterness, description, rating, mashVolume, spargeVolume, fermentationSteps, cookingTime, cookingTemperatur} = this.state;
        const { malts = [], hops = [], yeasts = [], additionalIngredients = [], messageType, message, beers = [] } = this.props;

        let info: string = "";
        if (isEqual(isSubmitSuccessful, true)) {
            info = "Beer created successfully";
        } else if (isSubmitSuccessful === false) {
            info = "Beer creation failed";
        }

        // Import-Button und verstecktes File-Input
        const { missingMalts = [], missingHops = [], missingYeasts = [] } = this.state;
        return (
            <form className="beer-form" onSubmit={this.handleSubmit}>
                {/* Import Button */}
                <input
                    type="file"
                    accept="application/json"
                    style={{ display: 'none' }}
                    ref={ref => this.fileInput = ref}
                    onChange={this.handleImportBeerJson}
                />
                <button
                    type="button"
                    className="add-button"
                    style={{ marginBottom: 10, marginRight: 10 }}
                    onClick={() => this.fileInput && this.fileInput.click()}
                >
                    Importieren
                </button>
                {/* Fehlende Zutaten anzeigen */}
                {(missingMalts.length > 0 || missingHops.length > 0 || missingYeasts.length > 0) && (
                    <div style={{ color: 'orange', marginBottom: 10 }}>
                        {missingMalts.length > 0 && <div>Fehlende Malze: {missingMalts.join(', ')}</div>}
                        {missingHops.length > 0 && <div>Fehlende Hopfen: {missingHops.join(', ')}</div>}
                        {missingYeasts.length > 0 && <div>Fehlende Hefen: {missingYeasts.join(', ')}</div>}
                    </div>
                )}
                {/* Dropdown für Bierauswahl */}
                <label className="full-width">
                    Bier auswählen:
                    <select onChange={this.handleBeerSelect} value={beers.find(b => b.name === name)?.id || ''}>
                        <option value="">Neues Bier anlegen</option>
                        {beers.map(beer => (
                            <option key={beer.id} value={beer.id}>{beer.name}</option>
                        ))}
                    </select>
                </label>
                {/* Button zum Leeren des Formulars */}
                <button type="button" className="add-button" onClick={this.resetForm} style={{marginBottom: 10}}>Neues Bier</button>

                <label>
                    Name:
                    <input type="text" name="name" className="field-name" value={name} onChange={this.handleChange} required={true} maxLength={15} />
                </label>

                <label>
                    Type:
                    <input type="text" name="type" className="field-type" value={type} onChange={this.handleChange} required={true} maxLength={10} />
                </label>

                <label>
                    Farbe:
                    <input type="text" name="color" className="field-color" value={color} onChange={this.handleChange} maxLength={4} />
                </label>

                <label>
                    Alkoholgehalt:
                    <input type="number" name="alcohol" className="field-number-small" value={alcohol} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />
                </label>

                <label>
                    Stammwürze:
                    <input type="number" name="originalwort" className="field-number-small" value={originalwort} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />
                </label>

                <label>
                    Bitterkeit:
                    <input type="number" name="bitterness" className="field-number-small" value={bitterness} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />
                </label>


                <label>
                    Bewertung:
                    <input type="number" name="rating" className="field-number-small" value={rating} min={0} max={5} onChange={this.handleChange} />
                </label>

                <label>
                    Hauptguss (l):
                    <input type="number" name="mashVolume" className="field-number-small" min={0} value={mashVolume} step={0.1} onChange={this.handleChange} required={true} max={99} />
                </label>

                <label>
                    Nachguss (l):
                    <input type="number" name="spargeVolume" className="field-number-small" min={0} step={0.1} value={spargeVolume} onChange={this.handleChange} required={true} max={99} />
                </label>

                <label>
                    Kochzeit (min):
                    <input type="number" name="cookingTime" className="field-number-medium" min={0} value={cookingTime} onChange={this.handleChange} required={true} max={999} />
                </label>

                <label>
                    Kochtemp.:
                    <input type="number" name="cookingTemperatur" className="field-number-small" min={1} value={cookingTemperatur} onChange={this.handleChange} required={true} max={99} />
                </label>

                <label className="full-width">
                    Beschreibung:
                    <textarea
                        name="description"
                        value={description}
                        onChange={this.handleChange}
                        style={{ height: '50px' ,width: '66.4%' }}
                    />
                </label>

                <div className="full-width tables-container">
                    <div className="table-section">
                        <h3>Maischeplan:</h3>
                        <div className="table-wrapper" style={{overflowX: 'auto', maxHeight: '180px'}}>
                            <table className="ingredient-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{position: 'sticky', top: 0, background: COLOR_WHITE, zIndex: 2}}>
                                    <tr>
                                        <th>Type</th>
                                        <th>Modus</th>
                                        <th>Temp (°C)</th>
                                        <th>Zeit (min)</th>
                                        <th className="action-column">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fermentationSteps?.map((step, index) => {
                                        const rastCount = fermentationSteps.slice(0, index + 1).filter((s) => !Object.values(MashingType).includes(s.type as MashingType) || s.type === '').length;
                                        const isFixed = this.fixedTypes.includes(step.type);
                                        const executionMode = this.getExecutionMode(step);
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    {isFixed ? (
                                                        <span style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            background: COLOR_WHITE,
                                                            color: COLOR_DARK_BG,
                                                            border: `1px solid ${COLOR_BORDER_INPUT_ALT}`,
                                                            borderRadius: '4px',
                                                            fontSize: '15px',
                                                            fontFamily: 'inherit',
                                                            minWidth: '120px',
                                                            boxSizing: 'border-box',
                                                            height: '30px',
                                                            padding: '0 2px',
                                                            textAlign: 'left'
                                                        }}>{step.type}</span>
                                                    ) : (
                                                        <select name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={false}>
                                                            <option value="">Rast {rastCount}</option>
                                                            {Object.values(MashingType).map((mashingType) => (
                                                                <option key={mashingType} value={mashingType}>
                                                                    {mashingType}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    {isFixed ? (
                                                        <span style={{opacity: 0.7}}>–</span>
                                                    ) : (
                                                        <select
                                                            name="executionMode"
                                                            value={executionMode}
                                                            onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)}
                                                        >
                                                            <option value={RestExecutionMode.TIMED}>Zeitgesteuerte Rast</option>
                                                            <option value={RestExecutionMode.CONFIRMATION_HOLD}>Halten bis Bestätigung</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    <input type="number" name="temperature" value={step.temperature} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={true} />
                                                </td>
                                                <td>
                                                    {executionMode === RestExecutionMode.TIMED ? (
                                                        <input type="number" name="time" min={isFixed ? 0 : 1} value={step.time ?? ''} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={!isFixed} />
                                                    ) : (
                                                        <span style={{opacity: 0.7}}>–</span>
                                                    )}
                                                </td>
                                                <td className="action-column">
                                                    {index > 0 && !isFixed && (
                                                        <button
                                                            type="button"
                                                            className="cancel-btn"
                                                            onClick={() => this.removeFermentationStep(index)}
                                                            title="Löschen"
                                                        >
                                                            <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addFermentationStep}>Rast zufügen</button>
                    </div>

                    <div className="table-section">
                        <h3>Malze</h3>
                        <div className="table-wrapper" style={{overflowX: 'auto', maxHeight: '180px'}}>
                            <table className="ingredient-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{position: 'sticky', top: 0, background: COLOR_WHITE, zIndex: 2}}>
                                    <tr>
                                        <th>Name</th>
                                        <th>Menge (g)</th>
                                        <th className="action-column">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maltsDTO?.map((step, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select
                                                    name="name"
                                                    value={step.name}
                                                    onChange={(e) => this.handleMaltChange(e.target.value, e.target.name, index)}
                                                    required={true}
                                                >
                                                    <option value="">Malz</option>
                                                    {malts.map((malt) => (
                                                        <option key={malt.id} value={malt.name}>
                                                            {malt.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    min={0}
                                                    value={step.quantity}
                                                    onChange={(e) => this.handleMaltChange(e.target.value, e.target.name, index)}
                                                    required={true}
                                                />
                                            </td>
                                            <td className="action-column">
                                                <button
                                                    type="button"
                                                    className="cancel-btn"
                                                    onClick={() => this.removeMalts(index)}
                                                    title="Löschen"
                                                >
                                                    <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addMalts}>Malz zufügen</button>
                    </div>

                    <div className="table-section">
                        <h3>Hopfen</h3>
                        <div className="table-wrapper" style={{overflowX: 'auto', maxHeight: '180px'}}>
                            <table className="ingredient-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{position: 'sticky', top: 0, background: COLOR_WHITE, zIndex: 2}}>
                                    <tr>
                                        <th>Name</th>
                                        <th>Menge (g)</th>
                                        <th>Verwendung</th>
                                        <th>Zeitangabe</th>
                                        <th>Einheit</th>
                                        <th className="action-column">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hopsDTO?.map((step, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select
                                                    name="name"
                                                    value={step.name}
                                                    onChange={(e) => this.handleHopChange(e.target.value, "name", index)}
                                                    required={true}
                                                >
                                                    <option value="">Hopfen</option>
                                                    {hops.map((hop) => (
                                                        <option key={hop.id} value={hop.name}>
                                                            {hop.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    min={0}
                                                    value={step.quantity}
                                                    onChange={(e) => this.handleHopChange(e.target.value, "quantity", index)}
                                                    required={true}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    name="usage"
                                                    value={step.usage ?? HopUsage.BOIL}
                                                    onChange={(e) => this.handleHopChange(e.target.value, "usage", index)}
                                                    required={true}
                                                >
                                                    <option value={HopUsage.BOIL}>Kochhopfen</option>
                                                    <option value={HopUsage.DRY_HOP}>Hopfen stopfen</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    name="time"
                                                    min={1}
                                                    value={step.time}
                                                    onChange={(e) => this.handleHopChange(e.target.value, "time", index)}
                                                    required={true}
                                                />
                                            </td>
                                            <td>
                                                {step.usage === HopUsage.DRY_HOP ? (
                                                    <select
                                                        name="timeUnit"
                                                        value={step.timeUnit ?? HopTimeUnit.DAYS}
                                                        onChange={(e) => this.handleHopChange(e.target.value, "timeUnit", index)}
                                                    >
                                                        <option value={HopTimeUnit.HOURS}>Stunden</option>
                                                        <option value={HopTimeUnit.DAYS}>Tage</option>
                                                    </select>
                                                ) : (
                                                    <span>Minuten</span>
                                                )}
                                            </td>
                                            <td className="action-column">
                                                <button
                                                    type="button"
                                                    className="cancel-btn"
                                                    onClick={() => this.removeHops(index)}
                                                    title="Löschen"
                                                >
                                                    <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addHops}>Hopfen zufügen</button>
                    </div>

                    <div className="table-section">
                        <h3>Hefe</h3>
                        <div className="table-wrapper" style={{overflowX: 'auto', maxHeight: '180px'}}>
                            <table className="ingredient-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{position: 'sticky', top: 0, background: COLOR_WHITE, zIndex: 2}}>
                                    <tr>
                                        <th>Name</th>
                                        <th>Menge (g)</th>
                                        <th className="action-column">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yeastsDTO?.map((step, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select
                                                    name="name"
                                                    value={step.name}
                                                    onChange={(e) => this.handleYeastChange(e.target.value, e.target.name, index)}
                                                    required={true}
                                                >
                                                    <option value="">Hefe</option>
                                                    {yeasts.map((yeast) => (
                                                        <option key={yeast.id} value={yeast.name}>
                                                            {yeast.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    min={0}
                                                    value={step.quantity}
                                                    onChange={(e) => this.handleYeastChange(e.target.value, e.target.name, index)}
                                                    required={true}
                                                />
                                            </td>
                                            <td className="action-column">
                                                <button
                                                    type="button"
                                                    className="cancel-btn"
                                                    onClick={() => this.removeYeast(index)}
                                                    title="Löschen"
                                                >
                                                    <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addYeast}>Hefe zufügen</button>
                    </div>

                    <div className="table-section">
                        <h3>Weitere Zutaten</h3>
                        <div className="table-wrapper" style={{overflowX: 'auto', maxHeight: '180px'}}>
                            <table className="ingredient-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{position: 'sticky', top: 0, background: COLOR_WHITE, zIndex: 2}}>
                                <tr>
                                    <th>Zutat</th>
                                    <th>Menge</th>
                                    <th>Einheit</th>
                                    <th>Phase</th>
                                    <th>Zeit</th>
                                    <th>Zeiteinheit</th>
                                    <th>Hinweis</th>
                                    <th className="action-column">Entfernen</th>
                                </tr>
                                </thead>
                                <tbody>
                                {additionalIngredientsDTO?.map((aStep, aIndex) => (
                                    <tr key={aIndex}>
                                        <td>
                                            <select
                                                name="name"
                                                value={aStep.name || ''}
                                                onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "name", aIndex)}
                                            >
                                                <option value="">Zutat</option>
                                                {additionalIngredients.map((aIngredient) => (
                                                    <option key={aIngredient.id} value={aIngredient.name}>
                                                        {aIngredient.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" min={0} name="quantity" value={aStep.quantity}
                                                   onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "quantity", aIndex)} />
                                        </td>
                                        <td>
                                            <input type="text" name="unit" value={aStep.unit}
                                                   onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "unit", aIndex)} />
                                        </td>
                                        <td>
                                            <select name="phase" value={aStep.phase}
                                                    onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "phase", aIndex)}>
                                                <option value={AdditionalIngredientPhase.MASH}>Maische</option>
                                                <option value={AdditionalIngredientPhase.BOIL}>Kochen</option>
                                                <option value={AdditionalIngredientPhase.WHIRLPOOL}>Whirlpool</option>
                                                <option value={AdditionalIngredientPhase.FERMENTATION}>Gärung</option>
                                                <option value={AdditionalIngredientPhase.MATURATION}>Reifung</option>
                                                <option value={AdditionalIngredientPhase.PACKAGING}>Abfüllung</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" min={1} name="time" value={aStep.time ?? ''}
                                                   onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "time", aIndex)} />
                                        </td>
                                        <td>
                                            <select name="timeUnit" value={aStep.timeUnit ?? AdditionalIngredientTimeUnit.DAYS}
                                                    onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "timeUnit", aIndex)}>
                                                <option value={AdditionalIngredientTimeUnit.MINUTES}>Minuten</option>
                                                <option value={AdditionalIngredientTimeUnit.HOURS}>Stunden</option>
                                                <option value={AdditionalIngredientTimeUnit.DAYS}>Tage</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="text" name="description" value={aStep.description ?? ''}
                                                   onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "description", aIndex)} />
                                        </td>
                                        <td className="action-column">
                                            <button type="button" className="cancel-btn" onClick={() => this.removeAdditionalIngredient(aIndex)} title="Löschen">
                                                <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addAdditionalIngredient}>Hinzufügen</button>
                    </div>
                </div>

                <button className="finish-btn submit-button" type="submit">
                    <span role="img" aria-label="Erstellen" style={{ fontSize: 22, verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '3px', marginRight: '8px' }}>💾</span>
                </button>
            </form>
        );
    }

    handleImportBeerJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { importBeer } = this.props;
        const file = event.target.files && event.target.files[0];
        if (file) {
            importBeer(file);
        }
        // Damit auch dieselbe Datei erneut ein onChange-Event auslöst.
        event.target.value = '';
    };

    render() {
        return (
            <div className='containerBeerForm'>
                <div style={{ height: '870px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ border: `1px solid ${BORDER_TRANSPARENT}`, borderRadius: '10px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ backgroundColor: COLOR_ACCENT, padding: '12px 16px', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography style={{ color: COLOR_WHITE }}>Bier</Typography>
                        </div>
                        <SimpleBar style={{ maxHeight: '820px', backgroundColor: COLOR_BREW_BG }}>
                            <div style={{ padding: '16px' }}>{this.renderCreateBeerForm()}</div>
                        </SimpleBar>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    malts: state.maltsReducer.malts,
    hops: state.hopsReducer.hops,
    yeasts: state.yeastReducer.yeasts,
    additionalIngredients: state.additionalIngredientsReducer.additionalIngredients || [],
    isSubmitSuccessful: state.beerDataReducer.isSubmitSuccessful,
    message: state.beerDataReducer.message,
    messageType: state.beerDataReducer.type,
    beerFormState: state.beerDataReducer.beerFormState,
    beers: state.beerDataReducer.beers,
    importedBeer: state.beerDataReducer.importedBeer,
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitBeer: (beer: BeerDTO) => dispatch(BeerActions.submitBeer(beer)),
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    getAdditionalIngredients: (isFetching: boolean) => dispatch(AdditionalIngredientsActions.getAdditionalIngredients(isFetching)),
    saveBeerFormState: (formState: any) => dispatch(BeerActions.saveBeerFormState(formState)),
    importBeer: (file: File) => dispatch(BeerActions.importBeer(file)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BeerForm);
