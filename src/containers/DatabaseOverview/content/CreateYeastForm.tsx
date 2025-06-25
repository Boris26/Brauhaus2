import * as React from 'react';
import {ChangeEvent, FormEvent} from 'react';
import {BeerActions} from "../../../actions/actions";
import {connect} from "react-redux";
import {isEqual} from "lodash";
import {Yeasts} from "../../../model/Yeasts";
import {YeastEVG, YeastType} from "../../../enums/eYeastType";
import '../BeerForm.css'
import ModalDialog, {DialogType} from "../../../components/ModalDialog/ModalDialog";

interface MaltFormState {
    id: string;
    name: string;
    description: string;
    colorEBC: string;
    isSuccessful: boolean;
    type: string;
    evg: string;
    temperature: string;
}
interface MaltFormProps {
    onSubmitMalt: (yeast: Yeasts) => void;
    resetSubmit: (resetValue: boolean) => void;
    isSuccessful: boolean;
}

class YeastForm extends React.Component<MaltFormProps,MaltFormState> {
    constructor(props: MaltFormProps) {
        super(props);
        this.state = {
            id: '',
            name: '',
            description: '',
            colorEBC: '',
            isSuccessful: true,
            type: '',
            evg: '',
            temperature: ''
        };
        this.handleSubmitYeast = this.handleSubmitYeast.bind(this);
    }

    componentDidUpdate(prevProps: Readonly<MaltFormProps>, prevState: Readonly<MaltFormState>, snapshot?: any) {
        const {isSuccessful} = this.props;
        if (!isEqual(isSuccessful,prevState.isSuccessful) )
        {
            this.setState({isSuccessful:isSuccessful});
        }
    }

    handleSubmitYeast = (e: FormEvent) => {
        e.preventDefault();
        const { name, description, colorEBC,isSuccessful ,evg,type,temperature} = this.state;
        const yeast:Yeasts={
            id:0,
            name: name,
            description: description,
            temperature: temperature ,
            type: type,
            evg: evg
        }
        this.props.onSubmitMalt(yeast);
    }
    handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // @ts-ignore
        this.setState({[name]: value} as unknown as Pick<YeastForm, keyof YeastForm>);
    };

    onConfirmDialog = () => {
        const {resetSubmit} = this.props;
        this.setState({isSuccessful:true});
        resetSubmit(true);
    }
    render(){

        const { name, description, colorEBC,isSuccessful ,evg,type,temperature} = this.state;
        let info:string = "";
        let openDialog:boolean = false;
        if (!isSuccessful && isSuccessful !== undefined)
        {
            console.log("isSuccessful: NOT " + isSuccessful);
            openDialog = true;
        }
        else
        {
            console.log("isSuccessful: " + isSuccessful);
            openDialog = false;
        }


        return (
            <div>
                <ModalDialog type={DialogType.ERROR} open= {openDialog} content={'Beer creation failed'} header={'Error'} onConfirm={this.onConfirmDialog}></ModalDialog>
                <form className="beer-form" onSubmit={this.handleSubmitYeast}>
                    <label>
                        Name:
                        <input type="text" name="name" value={name} onChange={this.handleChange} required={true}  />
                    </label>
                    <label>
                    Type:
                    <select name="type" value={type} onChange={this.handleChange} required={true}>
                        {Object.values(YeastType).map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                        Beschreibung:
                        <input type="text" name="description" value={description} onChange={this.handleChange}  />
                    </label>
                    <label>
                        EVG:
                        <select name="evg" value={type} onChange={this.handleChange} required={true}>
                            {Object.values(YeastEVG).map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Temperature:
                        <input type="text" name="temperature" value={temperature} min={0} onChange={this.handleChange} required={true}  />
                    </label>
                    <button className="submit-button" type="submit">Erstellen</button>
                </form>
                <h3>{info}</h3>
            </div>
        );
    }





}


const mapStateToProps = (state: any) => ({
    isSuccessful: state.beerDataReducer.isSubmitYeastSuccessful
});
const mapDispatchToProps = (dispatch: any) => ({
    onSubmitMalt: (yeast: Yeasts) => dispatch(BeerActions.submitNewYeast(yeast)),
    resetSubmit: (restValue: boolean) => dispatch(BeerActions.submitYeastSuccess(restValue))

});
export default connect(mapStateToProps,mapDispatchToProps)(YeastForm);
