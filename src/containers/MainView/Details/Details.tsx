import React from 'react';
import { connect } from 'react-redux';
import './Details.css';
import {Beer} from "../../../model/Beer";
import {
    Accordion, AccordionDetails, AccordionSummary,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel, Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";


interface DetailsProps {
    selectedBeer: Beer;
}

interface DetailsState {
    selectedBeer: Beer | undefined;

}

class Details extends React.Component<DetailsProps, DetailsState> {
    constructor(props: DetailsProps | Readonly<DetailsProps>) {
        super(props);
        this.state = {

            selectedBeer: undefined
        };
    }
    componentDidUpdate(prevProps: Readonly<DetailsProps>, prevState: Readonly<DetailsState>, snapshot?: any) {

    }

    handleDeleteFermentation = (index: number) => {
        console.log(index);
    };

renderFermentation()
{
    const {selectedBeer}=this.props;

    if(selectedBeer?.fermentation != undefined)
    {
        return(
            <div>

                <div className="table">
                    <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                        <Table className="wortBoiling-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Zeit</TableCell>
                                    <TableCell>Temp</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedBeer?.fermentation.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.type}</TableCell>
                                        <TableCell>{item.time}</TableCell>
                                        <TableCell>{item.temperature}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>

            </div>
        );
    }

}
renderFilling()
{
    const {selectedBeer}=this.props;
    if (selectedBeer?.malts != undefined)
    {
        return(
            <div>

                <div className='table'>
                    <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                        <Table className="wortBoiling-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Menge / g</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedBeer?.malts.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>
            </div>
        );
    }

}
    renderBrewingWater()
    {
        const {selectedBeer}=this.props;

        return(  <div>

            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                <Table className="wortBoiling-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Hauptguss</TableCell>
                            <TableCell>Nachguss</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>{selectedBeer?.mashVolume}</TableCell>
                            <TableCell>{selectedBeer?.spargeVolume}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </div>);
    }
    renderFermentationMaturation()
    {
        const {selectedBeer}=this.props;
        if (selectedBeer?.fermentationMaturation != undefined)
        {
            return(
                <div>

                    <div className='label'>
                        <label htmlFor="temp">Temperatur:</label>
                    </div>
                    <span id="temp" className="inputTextGeneral">
                            {selectedBeer?.fermentationMaturation.fermentationTemperature}
                </span>
                    <div className='label'>
                        <label htmlFor="carbonation">Karbonisierung:</label>
                    </div>
                    <span id="carbonation" className="inputTextGeneral">
                            {selectedBeer?.fermentationMaturation.carbonation}
                </span>
                    <div className='label'>
                        <label htmlFor="yeast">Hefe:</label>
                    </div>
                    <span id="yeast" className="inputTextGeneral">
                            {selectedBeer?.fermentationMaturation.yeast[0].name}
                </span>
                </div>
            );
        }

    }
    renderWortBoiling()
        {
            const {selectedBeer}=this.props;

            if (selectedBeer?.wortBoiling != undefined)
            {

                return(
                    <div>

                        <div className="wortBoiling-header ">
                            <label className="wortBoiling-header-text">Zeit: {selectedBeer.cookingTime} Min.</label>
                            <label className="wortBoiling-header-text">Temperatur: {selectedBeer.cookingTemperatur}°C </label>
                        </div>
                        <div>
                            <TableContainer component={Paper}>
                                <Table className="wortBoiling-table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Zeit</TableCell>
                                            <TableCell>Menge</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedBeer?.wortBoiling.hops.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.time}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                    </div>
                  );
            }

        }
        renderGeneralDate()
        {
            const {selectedBeer}=this.props;
            return(
                <div>
                    <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
    <Table className="wortBoiling-table">
        <TableBody>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Name</TableCell>
                <TableCell>{selectedBeer?.name}</TableCell>
            </TableRow>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Type</TableCell>
                <TableCell>{selectedBeer?.type}</TableCell>
            </TableRow>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Bitterheit</TableCell>
                <TableCell>{selectedBeer?.bitterness}</TableCell>
            </TableRow>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Farbe</TableCell>
                <TableCell>{selectedBeer?.color}</TableCell>
            </TableRow>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Alkohol Gehalt</TableCell>
                <TableCell>{selectedBeer?.alcohol}</TableCell>
            </TableRow>
            <TableRow sx={{ '&:not(:last-of-type)': { '& td, & th': { paddingBottom: 0.2 } } }}>
                <TableCell>Stammwürze</TableCell>
                <TableCell>{selectedBeer?.originalwort}</TableCell>
            </TableRow>
        </TableBody>
    </Table>
</TableContainer>

                </div>
              );
        }


    render() {
        return (
            <div className="input-container">
                <div className="header" style={{ position: 'sticky', top: 0 }}>
                    <span className="header-text">Details</span>
                </div>
                <div >
                    <Accordion defaultExpanded>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange',  }} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                            <Typography>Allgemeine Daten</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}> {this.renderGeneralDate()}</AccordionDetails>

                    </Accordion>

                    <Accordion>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange'}} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                            <Typography>Maischplan</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}>  {this.renderFermentation()}</AccordionDetails>
                    </Accordion>
                    <Accordion>
                        <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                            <Typography>Schüttung</Typography>
                        </AccordionSummary>
                      <AccordionDetails sx={{ backgroundColor: '#404040' }}> {this.renderFilling()}</AccordionDetails>

                    </Accordion>
                    <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Würzekochen</Typography>
                    </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                            {this.renderWortBoiling()}
                        </AccordionDetails>

                </Accordion>
                    <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange'}} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Gärung und Reifung</Typography>
                    </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}>   {this.renderFermentationMaturation()}</AccordionDetails>

                </Accordion>
                    <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange'}} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Wasser</Typography>
                    </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#404040' }}> {this.renderBrewingWater()}</AccordionDetails>

                </Accordion>
                </div>
            </div>
        );
    }
}


const mapStateToProps = (state: any) => ({selectedBeer : state.beerDataReducer.selectedBeer});



export default connect(mapStateToProps,null)(Details);
