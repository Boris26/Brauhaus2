import * as React from 'react';
import {FormEvent} from "react";
import {Hops} from "../../../model/Hops";
import {BeerActions} from "../../../actions/actions";
import {connect} from "react-redux";
import {HopsActions} from "../../../actions/hops.actions";
interface HopFormState {
  name: string;
  type: string;
  description: string;
  alpha: string;
}

interface HopFormProps {
    onSubmitHop: (hop: Hops) => void;
}
class HopForm extends React.Component<HopFormProps,HopFormState>
{
constructor(props: HopFormProps) {
    super(props);
    this.state = {
        name: '',
        type: '',
        description: '',
        alpha: ''
    };

    }

    handleSubmit = (e:  FormEvent) => {
            e.preventDefault();
            const { name, type, description, alpha } = this.state;

            const hop = {
                id: 0,
                name: name,
                type: type,
                description: description,
                alpha: alpha
            }
            this.props.onSubmitHop(hop);
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
          const { name, value } = e.target;
                // @ts-ignore
            this.setState({[name]: value} as unknown as Pick<HopForm, keyof HopForm>);
    }
render() {
  const { name, type, description, alpha } = this.state;
    return(
        <div>
            <form className="beer-form" onSubmit={this.handleSubmit}>
                <label>
                    Name:
                    <input type="text" name="name" value={name} onChange={this.handleChange}  />
                </label>
                <label>
                    Beschreibung:
                    <input type="text" name="description" value={description} onChange={this.handleChange}  />
                </label>
                <label>
                    Alpha:
                    <input type="text" name="alpha" value={alpha} onChange={this.handleChange}  />
                </label>
                <label>
                    Type:
                    <input type="text" name="type" value={type} onChange={this.handleChange}  />
                </label>
                <button className="submit-button" type="submit">Erstellen</button>
            </form>
        </div>
    );
  }

}
const mapStateToProps = (state: any) => ({
    isSuccessful: state.hopsReducer.isSubmitHopSuccessful
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitHop: (hop: Hops) => dispatch(HopsActions.submitNewHop(hop))
});

export default connect(mapStateToProps, mapDispatchToProps)(HopForm);
