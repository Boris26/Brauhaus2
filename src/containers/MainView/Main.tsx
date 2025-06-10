import React from 'react';

import Details from "./Details/Details";
import {connect} from "react-redux";
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import BeerTable from "./BeerRecipes/Table";
import {Beer} from "../../model/Beer";
import {BeerActions} from "../../actions/actions";
import getBeers = BeerActions.getBeers;
import { FinishedBrewsTable } from "./FinishBrewsBeers/FinishedBrewsTable";
import { finishedBrewsTestData } from "../../model/finishedBrewsTestData";

interface MainProps {
beers: Beer[]
getBeers: (isFetching:boolean) => void;
}

interface MainState
{
    maxHeight:number;
}
class Main extends React.Component<MainProps,MainState> {
    constructor(props: MainProps) {
        super(props);
        this.state={
            maxHeight:0,
        };
    }

    componentDidMount() {
        const {getBeers } = this.props;
        getBeers(true);
        this.calculateMaxHeight();
        window.addEventListener('resize', this.calculateMaxHeight)
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.calculateMaxHeight);
    }

    componentDidUpdate(prevProps: Readonly<MainProps>, prevState: Readonly<{}>, snapshot?: any) {

    }

    calculateMaxHeight = ()=>
    {
        const windowHeight = window.innerHeight;
        const maxHeightPercentage = 0.89;
        const calculatedMaxHeight = windowHeight * maxHeightPercentage;
        this.setState({ maxHeight: calculatedMaxHeight });
    }


    render() {
        const {beers} = this.props
        const { maxHeight } = this.state;

        return (
            <div className="content">
                <div className="CustomTable">
                    <SimpleBar style={{ maxHeight: maxHeight+'px' }}>
                        {beers && <BeerTable beers={beers} />}
                    </SimpleBar>
                </div>
                <div className="Details">
                    <SimpleBar style={{ maxHeight: maxHeight+'px' }}>
                        <Details />
                    </SimpleBar>

                </div>
            </div>
        );
    }
}
const mapStateToProps = (state: any) => ({beers: state.beerDataReducer.beers});
const mapDispatchToProps = (dispatch: any) => ({
    getBeers: (isFetching:boolean) => dispatch(getBeers(isFetching)),
});


export default connect(mapStateToProps,mapDispatchToProps)(Main);
