import React, { ChangeEvent, FormEvent } from 'react';
import {AdditionalIngredientPhase, AdditionalIngredientTimeUnit, Beer, FermentationSteps, Hop, Malt, Yeast} from "../../model/Beer";
import {AdditionalIngredientDTO, BeerDTO, HopDTO, MaltDTO, YeastDTO} from "../../model/BeerDTO";
import { HopUsage } from "../../enums/eHopUsage";
import { HopTimeUnit } from "../../enums/eHopTimeUnit";
import { normalizeHopDto, updateHopUsage, validateHopDto } from "./hopDefaults";
import { isValidExecutionMode, normalizeFermentationStep } from "./fermentationDefaults";
import {isEqual} from "lodash";

import {MashingType} from "../../enums/eMashingType";
import {RestExecutionMode} from "../../enums/eRestExecutionMode";
import './BeerForm.css'
import {AdditionalIngredient} from "../../model/AdditionalIngredient";
import ModalDialog, {DialogType} from "../../components/ModalDialog/ModalDialog";
import { isRequiredPositiveQuantity } from "../../utils/beerSubmission";

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
    isSubmitSuccessful?: boolean;
    messageType?: string;
    message?: string;
    beerFormState?: any;
    beers: Beer[];
    importBeer: (file: File) => void;
    importedBeer?: Beer;
    isSavingBeer?: boolean;
}

type BeerFormSection = 'basic' | 'brewing' | 'mash' | 'malts' | 'hops' | 'yeast' | 'additional';

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
    isSubmitSuccessful?: boolean;
    missingMalts?: string[];
    missingHops?: string[];
    missingYeasts?: string[];
    showValidationDialog: boolean;
    validationDialogMessage: string;
    validationErrors: Record<string, string>;
    expandedSections: Record<BeerFormSection, boolean>;
}

export class BeerForm extends React.Component<BeerFormProps, BeerFormState> {
    private fileInput: HTMLInputElement | null | undefined;
    private fixedTypes = ['Einmaischen', 'Abmaischen', 'Kochen'];
    constructor(props: BeerFormProps) {

        super(props);


        const defaultState = {
            id: '',
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
            maltsDTO: [{ id: '', name: '', quantity: undefined as any }],
            hopsDTO: [{ id: '', name: '', quantity: undefined as any, time: 0, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES }],
            yeastsDTO: [{ id: '', name: '', quantity: undefined as any }],
            additionalIngredientsDTO: [],
            isSubmitSuccessful: undefined,
            showValidationDialog: false,
            validationDialogMessage: '',
            validationErrors: {},
            expandedSections: {
                basic: true,
                brewing: true,
                mash: false,
                malts: false,
                hops: false,
                yeast: false,
                additional: false,
            },
        };

        // Wenn ein gespeicherter Formularstatus existiert, verwenden wir diesen, ansonsten den Standardstatus.
        this.state = {
            ...defaultState,
            ...(props.beerFormState || {}),
            expandedSections: props.beerFormState?.expandedSections || defaultState.expandedSections,
        };
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
        if (!isEqual(isSubmitSuccessful, prevProps.isSubmitSuccessful)) {
            this.setState({isSubmitSuccessful});
        }

        // Wenn importedBeer gesetzt ist und sich geändert hat, Formular mit importierten Daten füllen
        if (importedBeer && importedBeer !== prevProps.importedBeer) {
            this.setState({
                id: importedBeer.id || '',
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
                isSubmitSuccessful: undefined,
            }, () => {
                this.props.saveBeerFormState(this.state);
            });
        }

        if (!isEqual(this.state, prevState)) {
            this.props.saveBeerFormState(this.state);
        }

        if (this.props.beerFormState?.id && this.props.beerFormState.id !== prevProps.beerFormState?.id && this.props.beerFormState.id !== this.state.id) {
            this.setState({id: this.props.beerFormState.id});
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
                step[aName] = aValue === '' ? undefined : (isNaN(parsed) ? aValue : parsed);
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
                aStep[aName] = aValue === '' ? undefined : (isNaN(aParsed) ? aValue : aParsed);
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
            if (!this.isValidQuantity(aIngredient.quantity)) return false;
            if (!aIngredient.unit || aIngredient.unit.trim().length === 0) return false;
            if (!Object.values(AdditionalIngredientPhase).includes(aIngredient.phase)) return false;
            if (aIngredient.time !== undefined && !(Number(aIngredient.time) > 0)) return false;
            if (aIngredient.timeUnit !== undefined && !Object.values(AdditionalIngredientTimeUnit).includes(aIngredient.timeUnit)) return false;
        }
        return true;
    }

    isValidQuantity = (aValue: unknown): boolean => {
        return isRequiredPositiveQuantity(aValue);
    };

    validateIngredientQuantities = () => {
        const validationErrors: Record<string, string> = {};
        const quantityError = 'Bitte eine gültige Menge größer als 0 eingeben.';

        this.state.maltsDTO.forEach((malt, index) => {
            if (!this.isValidQuantity(malt.quantity)) validationErrors[`maltsDTO.${index}.quantity`] = quantityError;
        });
        this.state.hopsDTO.forEach((hop, index) => {
            if (!this.isValidQuantity(hop.quantity)) validationErrors[`hopsDTO.${index}.quantity`] = quantityError;
        });
        this.state.yeastsDTO.forEach((yeast, index) => {
            if (!this.isValidQuantity(yeast.quantity)) validationErrors[`yeastsDTO.${index}.quantity`] = quantityError;
        });
        this.state.additionalIngredientsDTO.forEach((ingredient, index) => {
            if (!this.isValidQuantity(ingredient.quantity)) validationErrors[`additionalIngredientsDTO.${index}.quantity`] = quantityError;
        });

        const expandedSections = { ...this.state.expandedSections };
        if (Object.keys(validationErrors).some((key) => key.startsWith('maltsDTO.'))) expandedSections.malts = true;
        if (Object.keys(validationErrors).some((key) => key.startsWith('hopsDTO.'))) expandedSections.hops = true;
        if (Object.keys(validationErrors).some((key) => key.startsWith('yeastsDTO.'))) expandedSections.yeast = true;
        if (Object.keys(validationErrors).some((key) => key.startsWith('additionalIngredientsDTO.'))) expandedSections.additional = true;
        this.setState({validationErrors, expandedSections});
        return validationErrors;
    };

    renderFieldError = (aKey: string) => {
        const error = this.state.validationErrors[aKey];
        return error ? <div role="alert" className="field-error">{error}</div> : null;
    };



    validateRequiredRecipeFields = () => {
        const validationErrors: Record<string, string> = {};
        const requiredTextError = 'Bitte ausfüllen.';
        const requiredNumberError = 'Bitte einen gültigen Wert größer als 0 eingeben.';

        if (!this.state.name.trim()) validationErrors.name = requiredTextError;
        if (!this.state.type.trim()) validationErrors.type = requiredTextError;

        ['bitterness', 'alcohol', 'originalwort', 'mashVolume', 'spargeVolume', 'cookingTime', 'cookingTemperatur'].forEach((field) => {
            const value = this.state[field as keyof BeerFormState];
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                validationErrors[field] = requiredNumberError;
            }
        });

        const expandedSections = { ...this.state.expandedSections };
        if (validationErrors.name || validationErrors.type) expandedSections.basic = true;
        if (validationErrors.bitterness || validationErrors.alcohol || validationErrors.originalwort) expandedSections.basic = true;
        if (validationErrors.mashVolume || validationErrors.spargeVolume || validationErrors.cookingTime || validationErrors.cookingTemperatur) expandedSections.brewing = true;

        this.setState((prevState) => ({validationErrors: {...prevState.validationErrors, ...validationErrors}, expandedSections}));
        return validationErrors;
    };

    renderInputError = (aKey: string) => this.renderFieldError(aKey);

    handleSubmit = (e: FormEvent) => {
        const {malts,hops,yeasts, isSavingBeer} = this.props;
        e.preventDefault();
        if (isSavingBeer) return;
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
        const quantityValidationErrors = this.validateIngredientQuantities();
        const requiredValidationErrors = this.validateRequiredRecipeFields();
        if (Object.keys(requiredValidationErrors).length > 0) {
            this.openValidationDialog('Bitte korrigiere die markierten Pflichtfelder.');
            return;
        }
        if (Object.keys(quantityValidationErrors).length > 0) {
            this.openValidationDialog('Bitte korrigiere die markierten Mengenfelder. Mengen sind erforderlich und müssen größer als 0 sein.');
            return;
        }
        if (!this.validateFermentationSteps(fermentationSteps)) {
            this.openValidationDialog('Bitte prüfe den Maischeplan: Zeitgesteuerte Rasten benötigen Zeit > 0, Halte-Rasten nur Temperatur.');
            return;
        }

        const malts_DTO = maltsDTO
            .map((aMalt) => {
                const malt = malts.find((malt) => malt.name === aMalt.name);
                if (!malt) return undefined;
                const quantity = Number(aMalt.quantity);
                return { name: malt.name, id: malt.id, quantity: quantity };
            })
            .filter((m): m is MaltDTO => m !== undefined);

        const normalizedHops = hopsDTO.map((aHop) => normalizeHopDto(aHop));
        if (!normalizedHops.every((aHop) => validateHopDto(aHop))) {
            this.openValidationDialog('Bitte prüfe die Hopfengaben: Menge und Zeit müssen > 0 sein. Kochhopfen nutzt Minuten, Hopfen stopfen Stunden oder Tage.');
            return;
        }

        const hops_DTO = normalizedHops
            .map((aHop): HopDTO | undefined => {
                const hop = hops.find((hop) => hop.name === aHop.name);
                if (!hop) return undefined;
                const quantity = Number(aHop.quantity);
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
                const quantity = Number(aYeast.quantity);
                return { name: yeast.name, id: yeast.id, quantity: quantity };
            })
            .filter((y): y is YeastDTO => y !== undefined);

        if (!this.validateAdditionalIngredients(additionalIngredientsDTO)) {
            this.openValidationDialog('Bitte prüfe weitere Zutaten: Zutat (ID/Name), Menge > 0, Einheit und gültige Phase sind erforderlich. Zeit darf nur > 0 gesetzt werden.');
            return;
        }

        const beer: BeerDTO = {
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
            fermentationSteps,
            cookingTime,
            cookingTemperatur,
            malts: malts_DTO,
            wortBoiling: { totalTime: 0, hops: hops_DTO },
            fermentationMaturation: { fermentationTemperature: 0, carbonation: 0, yeast: yeasts_DTO},
            // additionalIngredients wird 1:1 aus dem Rezepteditor übernommen, damit Import/Load/Save verlustfrei bleibt.
            additionalIngredients: additionalIngredientsDTO
                .map((aIngredient) => ({...aIngredient, quantity: Number(aIngredient.quantity)}))
        };

        this.props.onSubmitBeer(beer);
    };

    openValidationDialog = (message: string) => {
        this.setState({showValidationDialog: true, validationDialogMessage: message});
    };

    closeValidationDialog = () => {
        this.setState({showValidationDialog: false, validationDialogMessage: ''});
    };

    resetForm = () => {
        this.setState({
            name: '',
            id: '',
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
            validationErrors: {},
            expandedSections: {
                basic: true,
                brewing: true,
                mash: false,
                malts: false,
                hops: false,
                yeast: false,
                additional: false,
            },
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
            maltsDTO: [...prevState.maltsDTO, { id: '', name: '', quantity: undefined as any }],
        }));
    }

    addHops = () => {
        this.setState((prevState) => ({
            hopsDTO: [...prevState.hopsDTO, { id: '', name: '', quantity: undefined as any, time: 0, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES }],
        }));
    }

    addYeast = () => {
        this.setState((prevState) => ({
            yeastsDTO: [...prevState.yeastsDTO, {id: '', name: '', quantity: undefined as any}],
        }));
    }

    addAdditionalIngredient = () => {
        this.setState((prevState) => ({
            additionalIngredientsDTO: [...prevState.additionalIngredientsDTO, {
                quantity: undefined as any,
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
                id: selectedBeer.id || '',
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
                isSubmitSuccessful: undefined,
            }, () => {
                this.props.saveBeerFormState(this.state);
            });
        }
    };

    getSectionId = (section: BeerFormSection) => `beer-form-section-${section}`;

    isSectionExpanded = (section: BeerFormSection): boolean => this.state.expandedSections?.[section] ?? false;

    toggleSection = (section: BeerFormSection) => {
        this.setState((prevState) => ({
            expandedSections: {
                ...prevState.expandedSections,
                [section]: !(prevState.expandedSections?.[section] ?? false),
            },
        }));
    };

    handleSectionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, section: BeerFormSection) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggleSection(section);
        }
    };

    sectionHasError = (section: BeerFormSection): boolean => {
        const errorKeys = Object.keys(this.state.validationErrors);
        if (section === 'malts') return errorKeys.some((key) => key.startsWith('maltsDTO.'));
        if (section === 'hops') return errorKeys.some((key) => key.startsWith('hopsDTO.'));
        if (section === 'yeast') return errorKeys.some((key) => key.startsWith('yeastsDTO.'));
        if (section === 'additional') return errorKeys.some((key) => key.startsWith('additionalIngredientsDTO.'));
        return false;
    };

    renderAccordionSection = (section: BeerFormSection, title: string, summary: string, content: React.ReactNode) => {
        const expanded = this.isSectionExpanded(section);
        const contentId = this.getSectionId(section);
        return (
            <section className={`beer-accordion ${expanded ? 'expanded' : ''} ${this.sectionHasError(section) ? 'has-error' : ''}`}>
                <button
                    type="button"
                    className="beer-accordion-header"
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => this.toggleSection(section)}
                    onKeyDown={(event) => this.handleSectionKeyDown(event, section)}
                >
                    <span className="beer-accordion-title">{title}</span>
                    <span className="beer-accordion-meta">
                        {this.sectionHasError(section) && <span className="beer-accordion-error">Fehler</span>}
                        {summary && <span>{summary}</span>}
                        <span aria-hidden="true" className="beer-accordion-chevron">{expanded ? '▼' : '▶'}</span>
                    </span>
                </button>
                <div id={contentId} className="beer-accordion-content" hidden={!expanded}>
                    {content}
                </div>
            </section>
        );
    };

    renderCreateBeerForm() {
        const {maltsDTO, hopsDTO, yeastsDTO, additionalIngredientsDTO, isSubmitSuccessful, name, type, color, alcohol, originalwort, bitterness, description, rating, mashVolume, spargeVolume, fermentationSteps, cookingTime, cookingTemperatur} = this.state;
        const { malts = [], hops = [], yeasts = [], additionalIngredients = [], beers = [] } = this.props;
        const { missingMalts = [], missingHops = [], missingYeasts = [] } = this.state;

        let info: string = "";
        if (isEqual(isSubmitSuccessful, true)) {
            info = this.props.message || "Beer saved successfully";
        } else if (isSubmitSuccessful === false) {
            info = this.props.message || "Beer creation failed";
        }

        const basicContent = (
            <div className="beer-form-grid">
                <label>Name:<input type="text" name="name" className="field-name" value={name} onChange={this.handleChange} required={true} maxLength={15} />{this.renderInputError('name')}</label>
                <label>Typ:<input type="text" name="type" className="field-type" value={type} onChange={this.handleChange} required={true} maxLength={10} />{this.renderInputError('type')}</label>
                <label>Farbe:<input type="text" name="color" className="field-color" value={color} onChange={this.handleChange} maxLength={4} /></label>
                <label>Bitterkeit:<input type="number" name="bitterness" className="field-number-small" value={bitterness} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('bitterness')}</label>
                <label>Alkoholgehalt:<input type="number" name="alcohol" className="field-number-small" value={alcohol} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('alcohol')}</label>
                <label>Stammwürze:<input type="number" name="originalwort" className="field-number-small" value={originalwort} min={0} step={0.1} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('originalwort')}</label>
                <label>Bewertung:<input type="number" name="rating" className="field-number-small" value={rating} min={0} max={5} onChange={this.handleChange} /></label>
                <label className="full-width">Beschreibung:<textarea name="description" className="beer-description" value={description} onChange={this.handleChange} /></label>
            </div>
        );

        const brewingContent = (
            <div className="beer-form-grid brewing-data-grid">
                <label>Hauptguss (l):<input type="number" name="mashVolume" className="field-number-small" min={0} value={mashVolume} step={0.1} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('mashVolume')}</label>
                <label>Nachguss (l):<input type="number" name="spargeVolume" className="field-number-small" min={0} step={0.1} value={spargeVolume} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('spargeVolume')}</label>
                <label>Kochzeit (min):<input type="number" name="cookingTime" className="field-number-medium" min={0} value={cookingTime} onChange={this.handleChange} required={true} max={999} />{this.renderInputError('cookingTime')}</label>
                <label>Kochtemperatur:<input type="number" name="cookingTemperatur" className="field-number-small" min={1} value={cookingTemperatur} onChange={this.handleChange} required={true} max={99} />{this.renderInputError('cookingTemperatur')}</label>
            </div>
        );

        const mashContent = (
            <>
                <div className="table-wrapper">
                    <table className="ingredient-table">
                        <thead><tr><th>Typ</th><th>Modus</th><th>Temp (°C)</th><th>Zeit (min)</th><th className="action-column">Aktion</th></tr></thead>
                        <tbody>{fermentationSteps?.map((step, index) => {
                            const rastCount = fermentationSteps.slice(0, index + 1).filter((s) => !Object.values(MashingType).includes(s.type as MashingType) || s.type === '').length;
                            const isFixed = this.fixedTypes.includes(step.type);
                            const executionMode = this.getExecutionMode(step);
                            return <tr key={index}>
                                <td>{isFixed ? <span className="readonly-table-value">{step.type}</span> : <select name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={false}><option value="">Rast {rastCount}</option>{Object.values(MashingType).map((mashingType) => <option key={mashingType} value={mashingType}>{mashingType}</option>)}</select>}</td>
                                <td>{isFixed ? <span className="muted-table-value">–</span> : <select name="executionMode" value={executionMode} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)}><option value={RestExecutionMode.TIMED}>Zeitgesteuerte Rast</option><option value={RestExecutionMode.CONFIRMATION_HOLD}>Halten bis Bestätigung</option></select>}</td>
                                <td><input type="number" name="temperature" value={step.temperature} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={true} /></td>
                                <td>{executionMode === RestExecutionMode.TIMED ? <input type="number" name="time" min={isFixed ? 0 : 1} value={step.time ?? ''} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={!isFixed} /> : <span className="muted-table-value">–</span>}</td>
                                <td className="action-column">{index > 0 && !isFixed && <button type="button" className="cancel-btn brauhaus-button brauhaus-button-danger brauhaus-icon-button" onClick={() => this.removeFermentationStep(index)} title="Rast löschen" aria-label="Rast löschen">🗑️</button>}</td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>
                <button type="button" className="add-button brauhaus-button brauhaus-button-secondary section-add-button" onClick={this.addFermentationStep}>+ Rast hinzufügen</button>
            </>
        );

        const maltsContent = (
            <>
                <div className="table-wrapper"><table className="ingredient-table"><thead><tr><th>Name</th><th>Menge (g)</th><th className="action-column">Aktion</th></tr></thead><tbody>{maltsDTO?.map((step, index) => <tr key={index}><td><select name="name" value={step.name} onChange={(e) => this.handleMaltChange(e.target.value, e.target.name, index)} required={true}><option value="">Malz</option>{malts.map((malt) => <option key={malt.id} value={malt.name}>{malt.name}</option>)}</select></td><td><input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleMaltChange(e.target.value, e.target.name, index)} required={true} />{this.renderFieldError(`maltsDTO.${index}.quantity`)}</td><td className="action-column"><button type="button" className="cancel-btn brauhaus-button brauhaus-button-danger brauhaus-icon-button" onClick={() => this.removeMalts(index)} title="Malz löschen" aria-label="Malz löschen">🗑️</button></td></tr>)}</tbody></table></div>
                {maltsDTO.length === 0 && <p className="empty-section-note">Noch kein Malz hinzugefügt.</p>}
                <button type="button" className="add-button brauhaus-button brauhaus-button-secondary section-add-button" onClick={this.addMalts}>+ Malz hinzufügen</button>
            </>
        );

        const hopsContent = (
            <>
                <div className="table-wrapper"><table className="ingredient-table"><thead><tr><th>Name</th><th>Menge (g)</th><th>Verwendung</th><th>Zeitangabe</th><th>Einheit</th><th className="action-column">Aktion</th></tr></thead><tbody>{hopsDTO?.map((step, index) => <tr key={index}><td><select name="name" value={step.name} onChange={(e) => this.handleHopChange(e.target.value, "name", index)} required={true}><option value="">Hopfen</option>{hops.map((hop) => <option key={hop.id} value={hop.name}>{hop.name}</option>)}</select></td><td><input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleHopChange(e.target.value, "quantity", index)} required={true} />{this.renderFieldError(`hopsDTO.${index}.quantity`)}</td><td><select name="usage" value={step.usage ?? HopUsage.BOIL} onChange={(e) => this.handleHopChange(e.target.value, "usage", index)} required={true}><option value={HopUsage.BOIL}>Kochhopfen</option><option value={HopUsage.DRY_HOP}>Hopfen stopfen</option></select></td><td><input type="number" name="time" min={1} value={step.time} onChange={(e) => this.handleHopChange(e.target.value, "time", index)} required={true} /></td><td>{step.usage === HopUsage.DRY_HOP ? <select name="timeUnit" value={step.timeUnit ?? HopTimeUnit.DAYS} onChange={(e) => this.handleHopChange(e.target.value, "timeUnit", index)}><option value={HopTimeUnit.HOURS}>Stunden</option><option value={HopTimeUnit.DAYS}>Tage</option></select> : <span className="muted-table-value">Minuten</span>}</td><td className="action-column"><button type="button" className="cancel-btn brauhaus-button brauhaus-button-danger brauhaus-icon-button" onClick={() => this.removeHops(index)} title="Hopfen löschen" aria-label="Hopfen löschen">🗑️</button></td></tr>)}</tbody></table></div>
                {hopsDTO.length === 0 && <p className="empty-section-note">Noch kein Hopfen hinzugefügt.</p>}
                <button type="button" className="add-button brauhaus-button brauhaus-button-secondary section-add-button" onClick={this.addHops}>+ Hopfen hinzufügen</button>
            </>
        );

        const yeastContent = (
            <>
                <div className="table-wrapper"><table className="ingredient-table"><thead><tr><th>Name</th><th>Menge (g)</th><th className="action-column">Aktion</th></tr></thead><tbody>{yeastsDTO?.map((step, index) => <tr key={index}><td><select name="name" value={step.name} onChange={(e) => this.handleYeastChange(e.target.value, e.target.name, index)} required={true}><option value="">Hefe</option>{yeasts.map((yeast) => <option key={yeast.id} value={yeast.name}>{yeast.name}</option>)}</select></td><td><input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleYeastChange(e.target.value, e.target.name, index)} required={true} />{this.renderFieldError(`yeastsDTO.${index}.quantity`)}</td><td className="action-column"><button type="button" className="cancel-btn brauhaus-button brauhaus-button-danger brauhaus-icon-button" onClick={() => this.removeYeast(index)} title="Hefe löschen" aria-label="Hefe löschen">🗑️</button></td></tr>)}</tbody></table></div>
                {yeastsDTO.length === 0 && <p className="empty-section-note">Noch keine Hefe hinzugefügt.</p>}
                <button type="button" className="add-button brauhaus-button brauhaus-button-secondary section-add-button" onClick={this.addYeast}>+ Hefe hinzufügen</button>
            </>
        );

        const additionalContent = (
            <>
                <div className="table-wrapper"><table className="ingredient-table"><thead><tr><th>Zutat</th><th>Menge</th><th>Einheit</th><th>Phase</th><th>Zeit</th><th>Zeiteinheit</th><th>Hinweis</th><th className="action-column">Aktion</th></tr></thead><tbody>{additionalIngredientsDTO?.map((aStep, aIndex) => <tr key={aIndex}><td><select name="name" value={aStep.name || ''} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "name", aIndex)}><option value="">Zutat</option>{additionalIngredients.map((aIngredient) => <option key={aIngredient.id} value={aIngredient.name}>{aIngredient.name}</option>)}</select></td><td><input type="number" min={0} name="quantity" value={aStep.quantity} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "quantity", aIndex)} />{this.renderFieldError(`additionalIngredientsDTO.${aIndex}.quantity`)}</td><td><input type="text" name="unit" value={aStep.unit} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "unit", aIndex)} /></td><td><select name="phase" value={aStep.phase} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "phase", aIndex)}><option value={AdditionalIngredientPhase.MASH}>Maische</option><option value={AdditionalIngredientPhase.BOIL}>Kochen</option><option value={AdditionalIngredientPhase.WHIRLPOOL}>Whirlpool</option><option value={AdditionalIngredientPhase.FERMENTATION}>Gärung</option><option value={AdditionalIngredientPhase.MATURATION}>Reifung</option><option value={AdditionalIngredientPhase.PACKAGING}>Abfüllung</option></select></td><td><input type="number" min={1} name="time" value={aStep.time ?? ''} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "time", aIndex)} /></td><td><select name="timeUnit" value={aStep.timeUnit ?? AdditionalIngredientTimeUnit.DAYS} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "timeUnit", aIndex)}><option value={AdditionalIngredientTimeUnit.MINUTES}>Minuten</option><option value={AdditionalIngredientTimeUnit.HOURS}>Stunden</option><option value={AdditionalIngredientTimeUnit.DAYS}>Tage</option></select></td><td><input type="text" name="description" value={aStep.description ?? ''} onChange={(e) => this.handleAdditionalIngredientChange(e.target.value, "description", aIndex)} /></td><td className="action-column"><button type="button" className="cancel-btn brauhaus-button brauhaus-button-danger brauhaus-icon-button" onClick={() => this.removeAdditionalIngredient(aIndex)} title="Zutat löschen" aria-label="Zutat löschen">🗑️</button></td></tr>)}</tbody></table></div>
                {additionalIngredientsDTO.length === 0 && <p className="empty-section-note">Noch keine weitere Zutat hinzugefügt.</p>}
                <button type="button" className="add-button brauhaus-button brauhaus-button-secondary section-add-button" onClick={this.addAdditionalIngredient}>+ Zutat hinzufügen</button>
            </>
        );

        return (
            <form id="beer-recipe-form" className="beer-form" onSubmit={this.handleSubmit} noValidate>
                <input type="file" accept="application/json" className="visually-hidden-file" ref={ref => this.fileInput = ref} onChange={this.handleImportBeerJson} />
                <div className="beer-form-toolbar">
                    <div className="beer-form-toolbar-title">Rezept</div>
                    <label className="beer-select-label">Bier auswählen:<select onChange={this.handleBeerSelect} value={beers.find(b => b.name === name)?.id || ''}><option value="">Neues Bier anlegen</option>{beers.map(beer => <option key={beer.id} value={beer.id}>{beer.name}</option>)}</select></label>
                    <button type="button" className="add-button brauhaus-button brauhaus-button-secondary toolbar-button" onClick={this.resetForm}>Neues Bier</button>
                    <button type="button" className="add-button brauhaus-button brauhaus-button-secondary toolbar-button" onClick={() => this.fileInput && this.fileInput.click()}>Importieren</button>
                </div>
                <div className="beer-form-overview" aria-label="Rezeptübersicht">
                    <div className="beer-form-overview-item"><span>Name</span><strong>{name || 'Neues Bier'}</strong></div>
                    <div className="beer-form-overview-item"><span>Typ</span><strong>{type || '–'}</strong></div>
                    <div className="beer-form-overview-item"><span>Braudaten</span><strong>{mashVolume || 0} l / {spargeVolume || 0} l</strong></div>
                    <div className="beer-form-overview-item"><span>Zutaten</span><strong>{maltsDTO.length + hopsDTO.length + yeastsDTO.length + additionalIngredientsDTO.length}</strong></div>
                </div>
                {(missingMalts.length > 0 || missingHops.length > 0 || missingYeasts.length > 0) && <div className="missing-ingredients-warning">{missingMalts.length > 0 && <div>Fehlende Malze: {missingMalts.join(', ')}</div>}{missingHops.length > 0 && <div>Fehlende Hopfen: {missingHops.join(', ')}</div>}{missingYeasts.length > 0 && <div>Fehlende Hefen: {missingYeasts.join(', ')}</div>}</div>}
                {info && <div className="beer-form-info">{info}</div>}
                <div className="beer-form-sections">
                    {this.renderAccordionSection('basic', 'Grunddaten', '', basicContent)}
                    {this.renderAccordionSection('brewing', 'Braudaten', '', brewingContent)}
                    {this.renderAccordionSection('mash', 'Maischeplan', `${fermentationSteps.length} Rasten`, mashContent)}
                    {this.renderAccordionSection('malts', 'Malze', `${maltsDTO.length} Einträge`, maltsContent)}
                    {this.renderAccordionSection('hops', 'Hopfen', `${hopsDTO.length} Einträge`, hopsContent)}
                    {this.renderAccordionSection('yeast', 'Hefe', `${yeastsDTO.length} Einträge`, yeastContent)}
                    {this.renderAccordionSection('additional', 'Weitere Zutaten', `${additionalIngredientsDTO.length} Einträge`, additionalContent)}
                </div>
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
        const {showValidationDialog, validationDialogMessage} = this.state;
        return (
            <div className='containerBeerForm'>
                <ModalDialog
                    type={DialogType.ERROR}
                    open={showValidationDialog}
                    content={validationDialogMessage}
                    header={"Validierungsfehler"}
                    onConfirm={this.closeValidationDialog}
                />
                <div className="beer-form-panel">
                    <div className="beer-form-panel-header">
                        <span>Bier</span>
                        <div className="beer-form-panel-actions">
                            <button type="button" className="add-button brauhaus-button brauhaus-button-secondary secondary-action" onClick={this.resetForm}>Abbrechen / Zurücksetzen</button>
                            <button className="finish-btn brauhaus-button brauhaus-button-primary submit-button primary-action" type="submit" form="beer-recipe-form" disabled={this.props.isSavingBeer}>{this.props.isSavingBeer ? '⏳ Speichern...' : '💾 Rezept speichern'}</button>
                        </div>
                    </div>
                    <div className="beer-form-scroll">{this.renderCreateBeerForm()}</div>
                </div>
            </div>
        );
    }
}
