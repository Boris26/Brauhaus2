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
    bottomNavigationActionClasses, css,
    styled,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {MashingType} from "../../enums/eMashingType";
import MaltForm from './content/CreateMaltForm';
import YeastForm from './content/CreateYeastForm';
import {Yeasts} from "../../model/Yeast";
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
        const {isSubmitSuccessful,malts,hops,yeasts} = this.props;
        if (!isEqual(this.state.isSubmitSuccessful,prevState.isSubmitSuccessful) )
        {
            this.setState({isSubmitSuccessful:isSubmitSuccessful});
        }

    }

    handleFermentationStepChange = (value: string,name: string, index: number) => {
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
            const malt = malts.find((aMalt) => aMalt.name === aMalt.name)!;
            const quantity = aMalt.quantity;
            return {name: malt.name, id: malt.id, quantity: quantity};
        });


        const hops_DTO = hopsDTO.map((aHop) => {
            // @ts-ignore
            const hop = this.props.hops.find((hop) => hop.name === aHop.name)!;
            const quantity = aHop.quantity;
            const time = aHop.time;
            return { id: hop.id,name: hop.name ,quantity: quantity, time: time };
        });

        const yeasts_DTO = yeastsDTO.map((aYeast) => {
            // @ts-ignore
            const yeast = this.props.yeasts.find((yeast) => yeast.name === aYeast.name)!;
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
            fermentationMaturation: {  fermentationTemperature: 0,   carbonation: 0,   yeast: yeasts_DTO}};
        console.log(beer);
        this.props.onSubmitBeer(beer);
       // this.resetForm();
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
            maltsDTO: [...prevState.maltsDTO, { id: '',name: '', quantity: 0 }],
        }));
    }

    addHops = () => {
        this.setState((prevState) => ({
            hopsDTO: [...prevState.hopsDTO, { id: '',name: '', quantity: 0, time: 0 }],
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
        const {maltsDTO,hopsDTO,yeastsDTO,isSubmitSuccessful, name, type, color, alcohol, originalwort, bitterness, description, rating, mashVolume, spargeVolume, fermentationSteps ,cookingTime,cookingTemperatur} = this.state;
        const { malts, hops, yeasts,messageType,message } = this.props;
        console.log(isSubmitSuccessful);
        console.log(message);
        console.log(type);
        let info:string = "";
        if (isEqual(isSubmitSuccessful,true))
        {
            info = "Beer created successfully";
        }
        else if (isSubmitSuccessful === false)
        {
            info = "Beer creation failed";
        }
        return (
            <form className="beer-form" onSubmit={this.handleSubmit}>
                <label>
                    Name:
                    <input type="text" name="name" value={name} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Type:
                    <input type="text" name="type" value={type} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Farbe:
                    <input type="text" name="color" value={color} onChange={this.handleChange}  />
                </label>

                <label>
                    Alkoholgehalt:
                    <input type="number" name="alcohol" value={alcohol} min={0} step={0.1} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Stammwürze:
                    <input type="number" name="originalwort" value={originalwort} min={0} step={0.1} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Bitterkeit:
                    <input type="number" name="bitterness" value={bitterness} min={0} step={0.1} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Beschreibung:
                    <textarea name="description" value={description} onChange={this.handleChange}  />
                </label>

                <label>
                    Bewertung:
                    <input type="number" name="rating" value={rating} min={0} max={5} onChange={this.handleChange}  />
                </label>

                <label>
                    Hauptguss Volumen (liter) :
                    <input type="number" name="mashVolume" min={0} value={mashVolume} step={0.1} onChange={this.handleChange} required={true}  />
                </label>

                <label>
                    Nachguss Volumen (liter) :
                    <input type="number" name="spargeVolume" min={0} step={0.1} value={spargeVolume} onChange={this.handleChange} required={true}  />
                </label>
                <label>
                    Kochzeit minuten:
                    <input type="number" name="cookingTime" min={0} value={cookingTime} onChange={this.handleChange} required={true}  />
                </label>
                <label>
                    Kochtemperatur:
                    <input type="number" name="cookingTemperatur" min={70} value={cookingTemperatur} onChange={this.handleChange} required={true}  />
                </label>

                <div className="fermentation-steps-container">
                    <h3>Maischeplan:</h3>
                    {fermentationSteps?.map((step, index) => (
                        <div key={index} className="fermentation-step-container">
                            <label>
                                Type:
                                <select name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e.target.value,e.target.name, index)} required={false} >
                                    <option value="">Select Type</option>
                                    {Object.values(MashingType).map((mashingType) => (
                                        <option key={mashingType} value={mashingType}>
                                            {mashingType}
                                        </option>
                                    ))}

                                </select>
                                <input type="text" name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e.target.value,e.target.name, index)} required={true}  />
                            </label>

                            <label>
                                Temperature:
                                <input type="number" name="temperature" value={step.temperature} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>

                            <label>
                                Zeit:
                                <input type="number" name="time" value={step.time} onChange={(e) => this.handleFermentationStepChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>

                            {index > 0 && <button type="button" onClick={() => this.removeFermentationStep(index)}>Remove</button>}
                        </div>
                    ))}

                    <button type="button" onClick={this.addFermentationStep}>Rasten zufügen</button>
                </div>

                <div className="fermentation-steps-container">
                    <h3>Malze</h3>
                    {maltsDTO?.map((step, index) => (
                        <div key={index} className="fermentation-step-container">
                            <label>
                                Name:
                                <select name="name" value={step.name} onChange={(e) => this.handleMaltChange(e.target.value,e.target.name, index)} required={true} >
                                    <option value="">Type</option>
                                    {malts.map((malt) => (
                                        <option key={malt.id} value={malt.name}>
                                            {malt.name}
                                        </option>
                                    ))}

                                </select>
                                <input type="text" name="type" value={step.name} onChange={(e) => this.handleMaltChange(e.target.value,e.target.name, index)} required={true}  />
                            </label>
                            <label>
                                Menge:
                                <input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleMaltChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>


                            {index > 0 && <button type="button" onClick={() => this.removeMalts(index)}>Remove</button>}
                        </div>
                    ))}

                    <button type="button" onClick={this.addMalts}>Malz zufügen</button>
                </div>

                <div className="fermentation-steps-container">
                    <h3>Hopfen</h3>
                    {hopsDTO?.map((step, index) => (
                        <div key={index} className="fermentation-step-container">
                            <label>
                                Name:
                                <select name="name" value={step.name} onChange={(e) => this.handleHopChange(e.target.value,e.target.name, index)} required={true} >
                                    <option value="">Type</option>
                                    {hops.map((hop) => (
                                        <option key={hop.id} value={hop.name}>
                                            {hop.name}
                                        </option>
                                    ))}

                                </select>
                                <input type="text" name="type" value={step.name} onChange={(e) => this.handleHopChange(e.target.value,e.target.name, index)} required={true}  />
                            </label>
                            <label>
                                Menge:
                                <input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleHopChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>
                            <label>
                                Zeit:
                                <input type="number" name="time" min={0} value={step.time} onChange={(e) => this.handleHopChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>


                            {index > 0 && <button type="button" onClick={() => this.removeHops(index)}>Remove</button>}
                        </div>
                    ))}

                    <button type="button" onClick={this.addHops}>Hopfen zufügen</button>
                </div>

                <div className="fermentation-steps-container">
                    <h3>Hefe</h3>
                    {yeastsDTO?.map((step, index) => (
                        <div key={index} className="fermentation-step-container">
                            <label>
                                Name:
                                <select name="name" value={step.name} onChange={(e) => this.handleYeastChange(e.target.value,e.target.name, index)} required={true} >
                                    <option value="">Type</option>
                                    {yeasts.map((yeast) => (
                                        <option key={yeast.id} value={yeast.name}>
                                            {yeast.name}
                                        </option>
                                    ))}

                                </select>
                                <input type="text" name="type" value={step.name} onChange={(e) => this.handleYeastChange(e.target.value,e.target.name, index)} required={true}  />
                            </label>
                            <label>
                                Menge:
                                <input type="number" name="quantity" min={0} value={step.quantity} onChange={(e) => this.handleYeastChange(e.target.value, e.target.name,index)} required={true}  />
                            </label>


                            {index > 0 && <button type="button" onClick={() => this.removeYeast(index)}>Remove</button>}
                        </div>
                    ))}

                    <button type="button" onClick={this.addYeast}>Hefe zufügen</button>
                </div>
                <button className="submit-button" type="submit">Erstellen</button>

            </form>)
    }
    test() {
        console.log("test");
    }




    render() {
        return (
        <div className='containerBeerForm'>
            <div >
                <Accordion defaultExpanded sx={{backgroundColor: '#404040'}}>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '10px 10px 0 0' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                        <Typography>Bier</Typography>
                    </AccordionSummary>
                    <SimpleBar style={{ maxHeight: '716px' }}>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}> {this.renderCreateBeerForm()}</AccordionDetails>
                    </SimpleBar>
                </Accordion>
                <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange'}} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Malz</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}>  <MaltForm></MaltForm></AccordionDetails>

                </Accordion>

                <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Hopfen</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}> <HopForm></HopForm></AccordionDetails>

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
export default connect(mapStateToProps,mapDispatchToProps)(BeerForm);

