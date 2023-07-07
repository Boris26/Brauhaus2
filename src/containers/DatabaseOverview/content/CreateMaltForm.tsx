import * as React from 'react';
import {ChangeEvent, FormEvent} from "react";
import {BeerActions} from "../../../actions/actions";
import {connect} from "react-redux";
import {Malts} from "../../../model/Malt";
import {isEqual} from "lodash";

interface MaltFormState {
    id: string;
    name: string;
    description: string;
    colorEBC: string;
    isSuccessful: boolean;
}
interface MaltFormProps {
    onSubmitMalt: (malt: Malts) => void;
    isSuccessful: boolean;
}

class MaltForm extends React.Component<MaltFormProps,MaltFormState> {
    constructor(props: MaltFormProps) {
        super(props);
        this.state = {
            id: '',
            name: '',
            description: '',
            colorEBC: '',
            isSuccessful: false
        };
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidUpdate(prevProps: Readonly<MaltFormProps>, prevState: Readonly<MaltFormState>, snapshot?: any) {
        const {isSuccessful} = this.props;
        if (!isEqual(isSuccessful,prevState.isSuccessful) )
        {
            this.setState({isSuccessful:isSuccessful});
        }

    }

    handleSubmit = (e: FormEvent) => {


        e.preventDefault();
        const {
            id,
            name,
            description,
            colorEBC
        } = this.state;

        const malt: Malts = {
            id: '',
            name: name,
            description: description,
            ebc: parseInt(colorEBC)
        }

        this.props.onSubmitMalt(malt);
    }




    handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
            // @ts-ignore
        this.setState({[name]: value} as unknown as Pick<MaltForm, keyof MaltForm>);
    };
    render(){

        const { name, description, colorEBC,isSuccessful } = this.state;
        let info:string = "";
        if (isEqual(isSuccessful,true))
        {
            info = "Beer created successfully";
        }
        else if (isSuccessful === false)
        {
            info = "Beer creation failed";
        }

     return(
         <div>
             <form className="beer-form" onSubmit={this.handleSubmit}>
                 <label>
                     Name:
                     <input type="text" name="name" value={name} onChange={this.handleChange} required={true}  />
                 </label>
                 <label>
                     Beschreibung:
                     <input type="text" name="description" value={description} onChange={this.handleChange}  />
                 </label>
                 <label>
                     Farbe:
                     <input type="text" name="colorEBC" value={colorEBC} min={0} onChange={this.handleChange} required={true}  />
                 </label>
                 <button className="submit-button" type="submit">Erstellen</button>
                 <h3>{info}</h3>
             </form>
         </div>

     );
}





}


const mapStateToProps = (state: any) => ({
    isSuccessful: state.beerDataReducer.isSubmitMaltSuccessful
});
const mapDispatchToProps = (dispatch: any) => ({
    onSubmitMalt: (malt: Malts) => dispatch(BeerActions.submitNewMalt(malt)),

});
export default connect(mapStateToProps,mapDispatchToProps)(MaltForm);
