import React from 'react';

import Details from "./Details/Details";
import {testBeers} from "../../model/beerTestData";
import {connect} from "react-redux";
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import BeerTable from "./Table/Table";
import {Beer} from "../../model/Beer";
import {BeerActions} from "../../actions/actions";
import getBeers = BeerActions.getBeers;

interface MainProps {
beers: Beer[]
getBeers: (isFetching:boolean) => void;
}
class Main extends React.Component<MainProps> {
    constructor(props: MainProps) {
        super(props);
    }

    componentDidMount() {
        const {getBeers } = this.props;
        getBeers(true);
    }

    componentDidUpdate(prevProps: Readonly<MainProps>, prevState: Readonly<{}>, snapshot?: any) {
        const {beers} = this.props

    }


    render() {
        const {beers} = this.props
        console.log(beers?.length);
        console.log(beers);
        return (
            <div className="content">
                <div className="CustomTable">
                    {beers && <BeerTable beers={beers}/>}
                </div>
                <div className="Details">
                    <SimpleBar style={{ maxHeight: '100%', overflowY: 'auto' }}>
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

