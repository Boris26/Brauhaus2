import React, { ChangeEvent, FormEvent } from 'react';
import {Beer, FermentationSteps, Hop, Malt, Yeast} from "../../model/Beer";
import {BeerDTO, HopDTO, MaltDTO, YeastDTO} from "../../model/BeerDTO";
import {BeerActions} from "../../actions/actions";
import {connect} from "react-redux";
import {isEqual} from "lodash";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {MashingType} from "../../enums/eMashingType";
import MaltForm from './content/CreateMaltForm';
import YeastForm from './content/CreateYeastForm';
import HopForm from "./content/CreateHopForm";
import './BeerForm.css'
import SimpleBar from 'simplebar-react';

interface BeerFormProps {
    onSubmitBeer: (beer: BeerDTO) => void;
    getMalt: (isFetching: boolean) => void;
    getHop: (isFetching: boolean) => void;
    getYeast: (isFetching: boolean) => void;
    malts: Malt[];
    hops: Hop[];
    yeasts: Yeast[];
    isSubmitSuccessful: boolean;
    messageType: string;
    message: string;
}

interface BeerFormState {
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
    isSubmitSuccessful: boolean;
}

class BeerForm extends React.Component<BeerFormProps, BeerFormState> {
    constructor(props: BeerFormProps) {
        super(props);
        this.state = {
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
            isSubmitSuccessful: false,
        };
    }

    handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        this.setState({[name]: value} as unknown as Pick<BeerFormState, keyof BeerFormState>);
    };

    componentDidMount() {
        const {getMalt,getHop,getYeast} = this.props;
        getMalt(true);
        getHop(true);
        getYeast(true);
    }

    componentDidUpdate(prevProps: Readonly<BeerFormProps>, prevState: Readonly<BeerFormState>, snapshot?: any) {
        const {isSubmitSuccessful} = this.props;
        if (!isEqual(this.state.isSubmitSuccessful,prevState.isSubmitSuccessful)) {
            this.setState({isSubmitSuccessful:isSubmitSuccessful});
        }
    }

    handleFermentationStepChange = (value: string, name: string, index: number) => {
       if (value === 'Rast') {
            value = value + index;
       }
       this.setState((prevState) => {
          const fermentationSteps = [...prevState.fermentationSteps];
          const step = fermentationSteps[index];
          // @ts-ignore
          step[name] = value;
          return { fermentationSteps };
       });
    };

    handleMaltChange = (value: string, name: string, index: number) => {
        this.setState((prevState) => {
            const maltsDTO = [...prevState.maltsDTO];
            const step = maltsDTO[index];
            // @ts-ignore
            step[name] = value;
            return { maltsDTO };
        });
    }

    handleHopChange = (value: string, name: string, index: number) => {
        this.setState((prevState) => {
            const hopsDTO = [...prevState.hopsDTO];
            const step = hopsDTO[index];
            // @ts-ignore
            step[name] = value;
            return { hopsDTO };
        });
    }

    handleYeastChange = (value: string, name: string, index: number) => {
        this.setState((prevState) => {
            const yeastsDTO = [...prevState.yeastsDTO];
            const step = yeastsDTO[index];
            // @ts-ignore
            step[name] = value;
            return { yeastsDTO };
        });
    }

    handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, options } = e.target;
        const selectedValues = Array.from(options)
            .filter((option) => option.selected)
            .map((option) => option.value);
        this.setState({[name]: selectedValues} as unknown as Pick<BeerFormState, keyof BeerFormState>);
    };

    handleSubmit = (e: FormEvent) => {
        const {malts,hops,yeasts} = this.props;
        e.preventDefault();
        const {
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
        } = this.state;

        const malts_DTO = maltsDTO.map((aMalt) => {
            // @ts-ignore
            const malt = malts.find((malt) => malt.name === aMalt.name)!;
            const quantity = aMalt.quantity;
            return {name: malt.name, id: malt.id, quantity: quantity};
        });

        const hops_DTO = hopsDTO.map((aHop) => {
            // @ts-ignore
            const hop = hops.find((hop) => hop.name === aHop.name)!;
            const quantity = aHop.quantity;
            const time = aHop.time;
            return { id: hop.id, name: hop.name, quantity: quantity, time: time };
        });

        const yeasts_DTO = yeastsDTO.map((aYeast) => {
            // @ts-ignore
            const yeast = yeasts.find((yeast) => yeast.name === aYeast.name)!;
            const quantity = aYeast.quantity;
            return {name: yeast.name, id: yeast.id, quantity: quantity};
        });

        const beer: BeerDTO = {
            id: 0,
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
            fermentationMaturation: { fermentationTemperature: 0, carbonation: 0, yeast: yeasts_DTO}
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
        });
    };

    addFermentationStep = () => {
        this.setState((prevState) => ({
            fermentationSteps: [...prevState.fermentationSteps, { type: '', temperature: 0, time: 0 }],
        }));
    };

    addMalts = () => {
        this.setState((prevState) => ({
            maltsDTO: [...prevState.maltsDTO, { id: '', name: '', quantity: 0 }],
        }));
    }

    addHops = () => {
        this.setState((prevState) => ({
            hopsDTO: [...prevState.hopsDTO, { id: '', name: '', quantity: 0, time: 0 }],
        }));
    }

    addYeast = () => {
        this.setState((prevState) => ({
            yeastsDTO: [...prevState.yeastsDTO, {id: '', name: '', quantity: 0}],
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

    renderCreateBeerForm() {
        const {maltsDTO, hopsDTO, yeastsDTO, isSubmitSuccessful, name, type, color, alcohol, originalwort, bitterness, description, rating, mashVolume, spargeVolume, fermentationSteps, cookingTime, cookingTemperatur} = this.state;
        // Standardwerte setzen, falls Daten noch nicht geladen sind
        const { malts = [], hops = [], yeasts = [], messageType, message } = this.props;

        let info: string = "";
        if (isEqual(isSubmitSuccessful, true)) {
            info = "Beer created successfully";
        } else if (isSubmitSuccessful === false) {
            info = "Beer creation failed";
        }

        return (
            <form className="beer-form" onSubmit={this.handleSubmit}>
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

                <label className="full-width">
                    Beschreibung:
                    <textarea name="description" value={description} onChange={this.handleChange} />
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
                    <input type="number" name="cookingTemperatur" className="field-number-small" min={70} value={cookingTemperatur} onChange={this.handleChange} required={true} max={99} />
                </label>

                <div className="full-width tables-container">
                    <div className="table-section">
                        <h3>Maischeplan:</h3>
                        <div className="table-wrapper">
                            <table className="ingredient-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Temp (°C)</th>
                                        <th>Zeit (min)</th>
                                        <th className="action-column">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fermentationSteps?.map((step, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={false}>
                                                    <option value="">Typ</option>
                                                    {Object.values(MashingType).map((mashingType) => (
                                                        <option key={mashingType} value={mashingType}>
                                                            {mashingType}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" name="temperature" value={step.temperature} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={true} />
                                            </td>
                                            <td>
                                                <input type="number" name="time" value={step.time} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name, index)} required={true} />
                                            </td>
                                            <td className="action-column">
                                                {index > 0 && <button type="button" onClick={() => this.removeFermentationStep(index)}>Löschen</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addFermentationStep}>Rast zufügen</button>
                    </div>

                    <div className="table-section">
                        <h3>Malze</h3>
                        <div className="table-wrapper">
                            <table className="ingredient-table">
                                <thead>
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
                                                <button type="button" onClick={() => this.removeMalts(index)}>Löschen</button>
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
                        <div className="table-wrapper">
                            <table className="ingredient-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Menge (g)</th>
                                        <th>Zeit (min)</th>
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
                                                <input
                                                    type="number"
                                                    name="time"
                                                    min={0}
                                                    value={step.time}
                                                    onChange={(e) => this.handleHopChange(e.target.value, "time", index)}
                                                    required={true}
                                                />
                                            </td>
                                            <td className="action-column">
                                                <button type="button" onClick={() => this.removeHops(index)}>Löschen</button>
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
                        <div className="table-wrapper">
                            <table className="ingredient-table">
                                <thead>
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
                                                <button type="button" onClick={() => this.removeYeast(index)}>Löschen</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="add-button" onClick={this.addYeast}>Hefe zufügen</button>
                    </div>
                </div>

                <button className="submit-button" type="submit">Erstellen</button>
            </form>
        );
    }

    render() {
        return (
            <div className='containerBeerForm'>
                <div>
                    <Accordion defaultExpanded sx={{backgroundColor: '#404040'}}>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '10px 10px 0 0' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                            <Typography>Bier</Typography>
                        </AccordionSummary>
                        <SimpleBar style={{ maxHeight: '716px' }}>
                            <AccordionDetails sx={{ backgroundColor: '#404040' }}>{this.renderCreateBeerForm()}</AccordionDetails>
                        </SimpleBar>
                    </Accordion>
                    <Accordion>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange'}} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                            <Typography>Malz</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}><MaltForm></MaltForm></AccordionDetails>
                    </Accordion>
                    <Accordion>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                            <Typography>Hopfen</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}><HopForm></HopForm></AccordionDetails>
                    </Accordion>
                    <Accordion sx={{backgroundColor: '#404040'}}>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange',borderRadius: '0px 0px 10px 10px' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                            <Typography>Hefe</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                            <YeastForm></YeastForm>
                        </AccordionDetails>
                    </Accordion>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    malts: state.beerDataReducer.malts,
    hops: state.beerDataReducer.hops,
    yeasts: state.beerDataReducer.yeasts,
    isSubmitSuccessful: state.beerDataReducer.isSubmitSuccessful,
    message: state.beerDataReducer.message,
    messageType: state.beerDataReducer.type,
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitBeer: (beer: BeerDTO) => dispatch(BeerActions.submitBeer(beer)),
    getMalt: (isFetching: boolean) => dispatch(BeerActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(BeerActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(BeerActions.getYeasts(isFetching)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BeerForm);
