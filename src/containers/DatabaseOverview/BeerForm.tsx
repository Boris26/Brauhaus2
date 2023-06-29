import React, { ChangeEvent, FormEvent } from 'react';
import {Beer, FermentationSteps, Hop, Malt, Yeast} from "../../model/Beer";
import {json} from "stream/consumers";
import {BeerDTO, YeastDTO} from "../../model/BeerDTO";
import {BeerActions} from "../../actions/actions";
import {connect} from "react-redux";

interface BeerFormProps {
    onSubmit: (beer: BeerDTO) => void;
    malts: Malt[];
    hops: Hop[];
    yeast: Yeast[];
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
    fermentationSteps: FermentationSteps[];
    selectedMalts: string[];
    selectedHops: string[];
    selectedYeasts: string[];
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
            fermentationSteps: [],
            selectedMalts: [],
            selectedHops: [],
            selectedYeasts: [],
        };
    }

    handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        this.setState({[name]: value} as unknown as Pick<BeerFormState, keyof BeerFormState>);
    };

    handleFermentationStepChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const { name, value } = e.target;
        this.setState((prevState) => {
            const fermentationSteps = [...prevState.fermentationSteps];
            const step = fermentationSteps[index];
            // @ts-ignore
            step[name] = value;
            return { fermentationSteps };
        });
    };

    handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, options } = e.target;
        const selectedValues = Array.from(options)
            .filter((option) => option.selected)
            .map((option) => option.value);
        this.setState({[name]: selectedValues} as unknown as Pick<BeerFormState, keyof BeerFormState>);
    };


    handleSubmit = (e: FormEvent) => {
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
            fermentationSteps,
            selectedMalts,
            selectedHops,
            selectedYeasts,
        } = this.state;

        const malts = selectedMalts.map((maltName) => {
            const malt = this.props.malts.find((malt) => malt.name === maltName)!;
            return { id: malt.id, quantity: malt.quantity };
        });

        const hops = selectedHops.map((hopName) => {
            const hop = this.props.hops.find((hop) => hop.name === hopName)!;
            return { id: hop.id, quantity: hop.quantity, time: hop.time };
        });

        const yeasts = selectedYeasts.map((yeastName) => {
            const yeast = this.props.yeast.find((yeast) => yeast.name === yeastName)!;
            return { id: yeast.id, quantity: yeast.quantity};
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
            malts,
            wortBoiling: { totalTime: 0, hops: hops },
            fermentationMaturation: {  fermentationTemperature: 0,   carbonation: 0,   yeast: yeasts },
        };
        this.props.onSubmit(beer);
        this.resetForm();
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
            fermentationSteps: [],
            selectedMalts: [],
            selectedHops: [],
            selectedYeasts: [],
        });
    };

    addFermentationStep = () => {
        this.setState((prevState) => ({
            fermentationSteps: [...prevState.fermentationSteps, { type: '', temperature: 0, time: 0 }],
        }));
    };

    removeFermentationStep = (index: number) => {
        this.setState((prevState) => {
            const fermentationSteps = [...prevState.fermentationSteps];
            fermentationSteps.splice(index, 1);
            return { fermentationSteps };
        });
    };

    render() {
        const { name, type, color, alcohol, originalwort, bitterness, description, rating, mashVolume, spargeVolume, fermentationSteps, selectedMalts, selectedHops, selectedYeasts } = this.state;
        const { malts, hops, yeast } = this.props;

        return (
            <form className="beer-form" onSubmit={this.handleSubmit}>
                <h2>Create a Beer</h2>

                <label>
                    Name:
                    <input type="text" name="name" value={name} onChange={this.handleChange}  />
                </label>

                <label>
                    Type:
                    <input type="text" name="type" value={type} onChange={this.handleChange}  />
                </label>

                <label>
                    Color:
                    <input type="text" name="color" value={color} onChange={this.handleChange}  />
                </label>

                <label>
                    Alcohol:
                    <input type="number" name="alcohol" value={alcohol} onChange={this.handleChange}  />
                </label>

                <label>
                    Original Wort:
                    <input type="number" name="originalwort" value={originalwort} onChange={this.handleChange}  />
                </label>

                <label>
                    Bitterness:
                    <input type="number" name="bitterness" value={bitterness} onChange={this.handleChange}  />
                </label>

                <label>
                    Description:
                    <textarea name="description" value={description} onChange={this.handleChange}  />
                </label>

                <label>
                    Rating:
                    <input type="number" name="rating" value={rating} onChange={this.handleChange}  />
                </label>

                <label>
                    Mash Volume:
                    <input type="number" name="mashVolume" value={mashVolume} onChange={this.handleChange}  />
                </label>

                <label>
                    Sparge Volume:
                    <input type="number" name="spargeVolume" value={spargeVolume} onChange={this.handleChange}  />
                </label>

                <div className="fermentation-steps-container">
                    <h3>Fermentation Steps:</h3>
                    {fermentationSteps.map((step, index) => (
                        <div key={index} className="fermentation-step-container">
                            <label>
                                Type:
                                <input type="text" name="type" value={step.type} onChange={(e) => this.handleFermentationStepChange(e, index)}  />
                            </label>

                            <label>
                                Temperature:
                                <input type="number" name="temperature" value={step.temperature} onChange={(e) => this.handleFermentationStepChange(e, index)}  />
                            </label>

                            <label>
                                Time:
                                <input type="number" name="time" value={step.time} onChange={(e) => this.handleFermentationStepChange(e, index)}  />
                            </label>

                            {index > 0 && <button type="button" onClick={() => this.removeFermentationStep(index)}>Remove</button>}
                        </div>
                    ))}

                    <button type="button" onClick={this.addFermentationStep}>Add Fermentation Step</button>
                </div>

                <label>
                    Malts:
                    <select multiple name="selectedMalts" value={selectedMalts} onChange={this.handleSelectChange}>
                        {malts.map((malt) => (
                            <option key={malt.name} value={malt.name}>{malt.name}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Hops:
                    <select multiple name="selectedHops" value={selectedHops} onChange={this.handleSelectChange}>
                        {hops.map((hop) => (
                            <option key={hop.name} value={hop.name}>{hop.name}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Yeasts:
                    <select multiple name="selectedYeasts" value={selectedYeasts} onChange={this.handleSelectChange}>
                        {yeast.map((yeast) => (
                            <option key={yeast.name} value={yeast.name}>{yeast.name}</option>
                        ))}
                    </select>
                </label>

                <button type="submit">Create Beer</button>
            </form>
        );
    }
}

const mapDispatchToProps = (dispatch: any) => ({
    onSubmit: (beer: BeerDTO) => dispatch({type: 'SUBMIT_BEER', payload: beer}),});
export default connect(null,mapDispatchToProps)(BeerForm);

