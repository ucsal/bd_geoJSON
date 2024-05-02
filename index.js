const express = require('express');
const bodyParser = require('body-parser');
const shapefile = require('shapefile');
const csvtojson = require('csvtojson');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Função para converter shapefile para GeoJSON
async function shapefileToGeoJSON(shapefilePath) {
    const geoJSONFeatures = [];
    const geoJSON = {
        type: "FeatureCollection",
        features: []
    };

    const data = await shapefile.open(shapefilePath);
    await data.read();
    while (!data.done) {
        const feature = await data.read();
        geoJSONFeatures.push({
            type: "Feature",
            geometry: feature.geometry,
            properties: feature.properties
        });
    }
    geoJSON.features = geoJSONFeatures;
    return geoJSON;
}


async function planilhaToGeoJSON(planilhaPath) {
    const jsonArray = await csvtojson().fromFile(planilhaPath);
    const geoJSONFeatures = jsonArray.map(item => ({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)] // Assumindo que as colunas são latitude e longitude
        },
        properties: item
    }));

    return {
        type: "FeatureCollection",
        features: geoJSONFeatures
    };
}
app.post('/enviar', async (req, res) => {
    try {
        const shapefile = req.body.shapefile;
        const planilha = req.body.planilha;

        const shapefilePath = 'temp/shapefile.shp';
        const planilhaPath = 'temp/planilha.csv';

        fs.writeFileSync(shapefilePath, shapefile, 'base64');
        fs.writeFileSync(planilhaPath, planilha, 'base64');

        const shapefileGeoJSON = await shapefileToGeoJSON(shapefilePath);
        const planilhaGeoJSON = await planilhaToGeoJSON(planilhaPath);

        res.status(200).json({ shapefile: shapefileGeoJSON, planilha: planilhaGeoJSON });
    } catch (error) {
        console.error('Erro ao converter para GeoJSON:', error);
        res.status(500).json({ error: 'Erro ao converter para GeoJSON' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
