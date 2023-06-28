import React from 'react';
import { connect } from 'react-redux';
import {updateCurrentTime} from "../../../actions/actions";
import './Header.css';
import {Views} from "../../../enums/eViews";


interface HeaderProps {
    currentTime: Date;
    updateCurrentTime: () => void;
    setViewState: (viewState: Views) => void;
}

class Header extends React.Component<HeaderProps> {
    private timer: NodeJS.Timer | undefined;


    handleIconClick = (viewState: Views) => {
    const{setViewState} = this.props;
    setViewState(viewState);

    }


    render() {
        const { currentTime } = this.props;
        const formattedTime = currentTime.toLocaleTimeString();

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
    updateCurrentTime: () => dispatch(updateCurrentTime()),
    setViewState: (viewState: Views) => dispatch({type: 'SET_VIEW_STATE', payload: viewState}),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
