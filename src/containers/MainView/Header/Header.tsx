import React from 'react';
import { connect } from 'react-redux';
import './Header.css';
import {Views} from "../../../enums/eViews";
import {ApplicationActions, BeerActions} from "../../../actions/actions";
import setViewState = ApplicationActions.setViewState;



interface HeaderProps {
    setViewState: (viewState: Views) => void;
}

class Header extends React.Component<HeaderProps> {
    private timer: NodeJS.Timer | undefined;


    handleIconClick = (viewState: Views) => {
    const{setViewState} = this.props;
    setViewState(viewState);

    }


    render() {

        return (
            <div className="header-container">
                <h1>Brauhaus</h1>
                <div className="icons-container">
                    <img
                        src="beer.png"
                        alt="Icon 1"
                        className="icon"
                        onClick={() => this.handleIconClick(Views.MAIN)}
                    />
                    <img
                        src="brewing.png"
                        alt="Icon 2"
                        className="icon"
                        onClick={() => this.handleIconClick(Views.PRODUCTION)}
                    />
                    <img
                        src="bar.png"
                        alt="Icon 3"
                        className="icon"
                        onClick={() => this.handleIconClick(Views.DATABASE)}
                    />
                </div>
            </div>

        );
    }
}

const mapStateToProps = (state: any) => ({
    currentTime: state.currentTime,
});

const mapDispatchToProps = (dispatch: any) => ({
    setViewState: (viewState: Views) => dispatch(setViewState(viewState)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
