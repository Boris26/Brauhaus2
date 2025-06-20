import React from 'react';
import { connect } from 'react-redux';
import './Header.css';
import {Views} from "../../../enums/eViews";
import {ApplicationActions, BeerActions} from "../../../actions/actions";
import setViewState = ApplicationActions.setViewState;



interface HeaderProps {
    setViewState: (viewState: Views) => void;
    currentView: Views; // Hinzufügen des aktuellen Views als Prop
}

class Header extends React.Component<HeaderProps> {
    private timer: NodeJS.Timer | undefined;


    handleIconClick = (viewState: Views) => {
        const{setViewState} = this.props;
        setViewState(viewState);
    }

    // Hilfsfunktion, um die aktiven Tab-Klassen zu bestimmen
    getTabClassName = (view: Views) => {
        return `icon ${this.props.currentView === view ? 'active' : ''}`;
    }

    render() {
        return (
            <div className="Header">
                <h1>Brauhaus</h1>
                <div className="icons-container">
                    <img
                        src="beer.png"
                        alt="Icon 1"
                        className={this.getTabClassName(Views.MAIN)}
                        onClick={() => this.handleIconClick(Views.MAIN)}
                        title="Hauptansicht"
                    />
                    <img
                        src="brewing.png"
                        alt="Icon 2"
                        className={this.getTabClassName(Views.PRODUCTION)}
                        onClick={() => this.handleIconClick(Views.PRODUCTION)}
                        title="Produktion"
                    />
                    <img
                        src="bar.png"
                        alt="Icon 3"
                        className={this.getTabClassName(Views.DATABASE)}
                        onClick={() => this.handleIconClick(Views.DATABASE)}
                        title="Datenbank"
                    />
                    <img
                        src="beer-55.gif"
                        alt="Fertige Sude"
                        className={this.getTabClassName(Views.FINISHED_BREWS)}
                        onClick={() => this.handleIconClick(Views.FINISHED_BREWS)}
                        title="Fertige Sude"
                    />
                    <img
                        src="brewing.png" // Korrektur des Pfades, "/" entfernt
                        alt="Berechnungen"
                        className={this.getTabClassName(Views.BREWING_CALCULATIONS)}
                        onClick={() => this.handleIconClick(Views.BREWING_CALCULATIONS)}
                        title="Bierbrau-Berechnungen"
                    />
                </div>
            </div>

        );
    }
}

const mapStateToProps = (state: any) => ({
    currentTime: state.applicationReducer.currentTime,
    currentView: state.applicationReducer.view,
});

const mapDispatchToProps = (dispatch: any) => ({
    setViewState: (viewState: Views) => dispatch(setViewState(viewState)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
