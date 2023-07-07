import React from 'react';
import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import Main from "./MainView/Main";
import Production from "./Production/Production";
import DatabaseOverview from "./DatabaseOverview/BeerForm";
import {testBeers} from "../model/beerTestData";
import {Beer} from "../model/Beer";
import {BeerDTO} from "../model/BeerDTO";
import SimpleBar from "simplebar-react";
import Details from "./MainView/Details/Details";
import ModalDialog from "../components/ModalDialog";

interface indexMainProps {
    viewState: Views;
}
class Index extends React.Component<indexMainProps> {
    constructor(props: indexMainProps) {
        super(props);
    }

    render() {
            const { viewState } = this.props;
        return (
            <div>

                <SimpleBar style={{ maxHeight: '100%', overflowY: 'auto' }}>
                    {viewState === Views.MAIN && <Main/>}
                </SimpleBar>

                {viewState === Views.PRODUCTION && <Production />}
                {viewState === Views.DATABASE && <DatabaseOverview></DatabaseOverview>}
            </div>
        );
    }
}
const mapStateToProps = (state: any) => ({viewState: state.applicationReducer.view as Views});



export default connect(mapStateToProps)(Index);

