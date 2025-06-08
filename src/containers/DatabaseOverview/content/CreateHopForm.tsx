import * as React from 'react';
import {FormEvent} from "react";
import {Hops} from "../../../model/Hops";
import {BeerActions} from "../../../actions/actions";
import {connect} from "react-redux";
interface HopFormState {
  Name: string;
  Type: string;
  Description: string;
  Alpha: string;
}

interface HopFormProps {
    onSubmitHop: (hop: Hops) => void;
}
class HopForm extends React.Component<HopFormProps,HopFormState>
{
constructor(props: HopFormProps) {
    super(props);
    this.state = {
        Name: '',
        Type: '',
        Description: '',
        Alpha: ''
    };

    }

    handleSubmit = (e:  FormEvent) => {
            e.preventDefault();
            const { Name, Type, Description, Alpha } = this.state;

            const hop = {
                id: 0,
                Name: Name,
                Type: Type,
                Description: Description,
                Alpha: Alpha
            }
            this.props.onSubmitHop(hop);
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
          const { name, value } = e.target;
                // @ts-ignore
            this.setState({[name]: value} as unknown as Pick<HopForm, keyof HopForm>);
    }
render() {
  const { Name, Type, Description, Alpha } = this.state;
    return(
        <div>
            <form className="beer-form" onSubmit={this.handleSubmit}>
                <label>
                    Name:
                    <input type="text" name="Name" value={Name} onChange={this.handleChange}  />
                </label>
                <label>
                    Beschreibung:
                    <input type="text" name="Description" value={Description} onChange={this.handleChange}  />
                </label>
                <label>
                    Alpha:
                    <input type="text" name="Alpha" value={Alpha} onChange={this.handleChange}  />
                </label>
                <label>
                    Type:
                    <input type="text" name="Type" value={Type} onChange={this.handleChange}  />
                </label>
                <button className="submit-button" type="submit">Erstellen</button>
            </form>
        </div>
    );
  }

}
const mapStateToProps = (state: any) => ({
    isSuccessful: state.beerDataReducer.isSubmitHopSuccessful
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitHop: (hop: Hops) => dispatch(BeerActions.submitNewHop(hop))
});

export default connect(mapStateToProps, mapDispatchToProps)(HopForm);
