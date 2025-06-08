import {Beer} from "./Beer";
import {MashingType} from "../enums/eMashingType";

export const testBeers: Beer[] = [
    {
        id: 15,
        name: "IPA",
        type: "Ale",
        color: "Amber",
        alcohol: 6.5,
        originalwort: 14,
        bitterness: 60,
        description: "A hoppy and flavorful India Pale Ale",
        rating: 4.5,
        mashVolume: 16,
        spargeVolume: 4,
        cookingTime: 60,
        cookingTemperatur: 100,
        fermentation: [
            {
                type: "Einmaischen",
                temperature: 67,
                time: 60,
            },
            {
                type: "Abmaischen",
                temperature: 78,
                time: 10,
            },
            {
                type: "Rast1",
                temperature: 10,
                time: 50,
            },
            {
                type: "Rast2",
                temperature: 50,
                time: 30,
            },
        ],
        malts: [
            {
                id: "1",
                name: "Pale Ale Malt",
                description: "Base malt for a rich malt profile",
                EBC: 8,
                quantity: 4,
            },
        ],
        wortBoiling: {
            totalTime: 60,
            hops: [
                {
                    id: "1",
                    Name: "Cascade",
                    Description: "Citrusy and floral hop variety",
                    Alpha: 7,
                    Quantity: 30,
                    Time: 10
                },
                {
                    id: "2",
                    Name: "Centennial",
                    Description: "Classic American hop with a strong aroma",
                    Alpha: 10,
                    Quantity: 50,
                    Time: 10
                },
            ],
        },
        fermentationMaturation: {
            fermentationTemperature: 18,
            carbonation: 2.5,
            yeast: [
                {
                    id: "1",
                    name: "US-05",
                    description: "Clean and neutral ale yeast",
                    EVG: "High",
                    temperature: "18-22°C",
                    type: "Dry",
                    quantity: 50,
                },
            ],
        },
    },
    {
        id: 16,
        name: "Boris",
        type: "Ale",
        color: "Amber",
        alcohol: 6.5,
        originalwort: 14,
        bitterness: 60,
        description: "A hoppy and flavorful India Pale Ale",
        rating: 4.5,
        mashVolume: 16,
        spargeVolume: 4,
        cookingTemperatur: 100,
        cookingTime: 60,
        fermentation: [
            {
                type: "Einmaischen",
                temperature: 67,
                time: 60,
            },
            {
                type: "Abmaischen",
                temperature: 78,
                time: 10,
            },
            {
                type: "Rast1",
                temperature: 10,
                time: 50,
            },
            {
                type: "Rast2",
                temperature: 50,
                time: 30,
            },
        ],
        malts: [
            {
                id: "1",
                name: "Pale Ale Malt",
                description: "Base malt for a rich malt profile",
                EBC: 8,
                quantity: 4,
            },
        ],
        wortBoiling: {
            totalTime: 60,
            hops: [
                {
                    id: "1",
                    Name: "Cascade",
                    Description: "Citrusy and floral hop variety",
                    Alpha: 7,
                    Quantity: 30,
                    Time: 10
                },
                {
                    id: "2",
                    Name: "Centennial",
                    Description: "Classic American hop with a strong aroma",
                    Alpha: 10,
                    Quantity: 50,
                    Time: 10
                },
            ],
        },
        fermentationMaturation: {
            fermentationTemperature: 18,
            carbonation: 2.5,
            yeast: [
                {
                    id: "1",
                    name: "US-05",
                    description: "Clean and neutral ale yeast",
                    EVG: "High",
                    temperature: "18-22°C",
                    type: "Dry",
                    quantity: 50,
                },
            ],
        },
    },
];
