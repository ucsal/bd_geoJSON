const express = require('express');
const bodyParser = require('body-parser');
const csvtojson = require('csvtojson');
const multer = require('multer');
const multerConfig = require('./config/multer');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const { v4: uuidv4 } = require('uuid');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// Configuração do multer para salvar arquivos no diretório 'temp'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Adiciona um timestamp ao nome do arquivo para garantir unicidade
    }
});


// Configuração do PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'arnaldo',
    password: '1234',
    port: 5432,
});


async function csvToGeoJSON(file) {
    csvtojson()
    .fromFile(file.path)
    .then((jsonArrayObj) => {
        const features = jsonArrayObj.map((item) => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)],
                },
                properties: item, // Adicione mais campos conforme necessário
            };
        });

        const geoJsonObj = {
            type: 'FeatureCollection',
            features: features,
        };
        insertGeoJSON(file.originalname, 1, geoJsonObj);

    })
    .catch((err) => {
        console.error('Erro ao converter CSV para GeoJSON:', err);
    });
}

async function shpToGeoJSON(file) {

}



// Endpoint para upload de arquivos
app.post('/enviar', multer(multerConfig).single('file'), async (req, res) => {
    try {

        console.log(req.file);

        if(req.file.mimetype == 'text/csv') csvToGeoJSON(req.file)
        else shpToGeoJSON(req.file)

    } catch (error) {
        console.error('Erro ao converter para GeoJSON:', error);
        res.status(500).json({ error: 'Erro ao converter para GeoJSON' });
    }
});


// Endpoint para obter dados
app.get('/dados', async (req, res) => {
    try {
        // await pool.connect();
        const result = await pool.query('SELECT id, name FROM json');
        res.status(200).json(result.rows);
        // await pool.end();
    } catch (error) {
        console.error('Erro ao obter dados:', error);
        res.status(500).json({ error: 'Erro ao obter dados' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

async function insertGeoJSON(name, type, json) {

    try {
        // Inicie a transação
        await pool.query('BEGIN');

        // Inserir informações básicas sobre o GeoJSON
        const json_id = await insert('json', {
            id: uuidv4(),
            name: name,
            columns: json.features[0].properties ? Object.keys(json.features[0].properties).length : 0,
            rows: json.features.length,
            type: type,
            normalized: false,
            created_at: new Date().toISOString()
        });

        // Inserir informações sobre as chaves (keys)
        let ks = {};
        if (json.features[0].properties) {
            Object.keys(json.features[0].properties).forEach(el => {
                ks[el] = insert('keys', {
                    id: uuidv4(),
                    json_id: json_id,
                    name: el,
                    nullable: true,
                    type: "",
                });
            });
        }
        let row ;
        // Inserir informações sobre as linhas (rows) e os valores (values)
        for (let i = 0; i < json.features.length; i++) {
            row = await insert('rows', {
                id: uuidv4(),
                position: i
            });

            if (json.features[i].properties) {
                Object.entries(json.features[i].properties).forEach(([key, value]) => {
                    insert('value', {
                        id: uuidv4(),
                        keys_id: ks[key],
                        rows_id: row,
                        value: value
                    });
                });
            }
        }

        // Finalize a transação (efetue o commit)
        await pool.query('COMMIT');
    } catch (err) {
        // Em caso de erro, faça o rollback da transação
        await pool.query('ROLLBACK');
        console.error('Error inserting GeoJSON:', err);
    }
}

async function insert(tableName, data) {

    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
        const res = await pool.query(query, values);
    } catch (err) {
        console.error(`Error inserting data into ${tableName}:`, err);
    }

    return data.id;
}
