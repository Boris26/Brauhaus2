import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MaltForm from './content/CreateMaltForm';
import HopForm from './content/CreateHopForm';
import YeastForm from './content/CreateYeastForm';
import './BeerForm.css';

/**
 * Komponente zur Erstellung und Verwaltung von Zutaten für Bier (Malz, Hopfen, Hefe)
 */
const IngredientsFormPage: React.FC = () => {
    return (
        <div className='containerBeerForm'>
            <div>
                <Accordion defaultExpanded sx={{backgroundColor: '#404040'}}>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '10px 10px 0 0' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
                        <Typography>Malz</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                        <MaltForm />
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header">
                        <Typography>Hopfen</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                        <HopForm />
                    </AccordionDetails>
                </Accordion>
                
                <Accordion sx={{backgroundColor: '#404040'}}>
                    <AccordionSummary sx={{ backgroundColor: 'darkorange', borderRadius: '0px 0px 10px 10px' }} expandIcon={<ExpandMoreIcon />} aria-controls="panel3a-content" id="panel3a-header">
                        <Typography>Hefe</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                        <YeastForm />
                    </AccordionDetails>
                </Accordion>
            </div>
        </div>
    );
};

export default IngredientsFormPage;
