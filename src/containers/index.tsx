import React from 'react';
import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import Main from "./MainView/Main";
import Production from "./Production/Production";
import DatabaseOverview from "./DatabaseOverview/BeerForm";
import {testBeers} from "../model/beerTestData";
import {Beer} from "../model/Beer";
import {BeerDTO} from "../model/BeerDTO";

interface indexMainProps {
    viewState: Views;
}
class Index extends React.Component<indexMainProps> {
    constructor(props: indexMainProps) {
        super(props);
    }
onSubmit(beer: BeerDTO)
{
   const jesonBeer = JSON.stringify(beer);
console.log(jesonBeer);
}
    render() {
            const { viewState } = this.props;
        return (
            <div>
                {viewState === Views.MAIN && <Main />}
                {viewState === Views.PRODUCTION && <Production />}
                {viewState === Views.DATABASE && <DatabaseOverview  hops={testBeers[0].wortBoiling.hops} yeast={testBeers[0].fermentationMaturation.yeast} malts={testBeers[0].malts}  ></DatabaseOverview>}
            </div>
        );
    }
}
const mapStateToProps = (state: any) => ({viewState: state.viewState});



export default connect(mapStateToProps)(Index);

