import React from 'react';

import Details from "./Details/Details";
import {testBeers} from "../../model/beerTestData";
import {Views} from "../../enums/eViews";
import {connect} from "react-redux";
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import BeerTable from "./Table/Table";

interface MainProps {
viewState: Views;
}
class Main extends React.Component<MainProps> {
    constructor(props: MainProps) {
        super(props);
    }

    render() {
        const { viewState } = this.props;
        return (
            <div className="content">
                <div className="CustomTable">
                    <BeerTable beers={testBeers}/>
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
const mapStateToProps = (state: any) => ({viewState: state.viewState});



export default connect(mapStateToProps,)(Main);

