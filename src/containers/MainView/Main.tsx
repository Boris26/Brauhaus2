import React from 'react';
import CustomTable from "./Table/Table";
import Details from "./Details/Details";
import {testBeers} from "../../model/beerTestData";
import {updateCurrentTime} from "../../actions/actions";
import {Views} from "../../enums/eViews";
import {connect} from "react-redux";
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';

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
                    <CustomTable beers={testBeers} />
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

