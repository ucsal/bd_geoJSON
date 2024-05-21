const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
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

const upload = multer({ storage: storage });

// Configuração do PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'arnaldo',
    password: '1234',
    port: 5432,
});

// Função de conversão de planilha para GeoJSON
async function planilhaToGeoJSON(planilhaPath, planilhaData) {



    // insert('json',{
    //     name: planilhaPath
    // });
}

// Endpoint para upload de arquivos
app.post('/enviar', upload.single('planilha'), async (req, res) => {
    try {

        console.log(req);


        // Extrair o nome do arquivo da requisição
        // const planilhaNome = req.file.originalname;

        // // Ler os dados do arquivo CSV
        // const planilhaData = req.file.buffer.toString('utf-8');

        // // Converter o CSV para GeoJSON
        // const planilhaGeoJSON = await planilhaToGeoJSON(planilhaNome, planilhaData);

        // // Enviar a resposta com o GeoJSON
        // res.status(200).json({ planilha: planilhaGeoJSON });
    } catch (error) {
        // Lidar com erros
        console.error('Erro ao converter para GeoJSON:', error);
        res.status(500).json({ error: 'Erro ao converter para GeoJSON' });
    }
});


// Endpoint para obter dados
app.get('/dados', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM json');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao obter dados:', error);
        res.status(500).json({ error: 'Erro ao obter dados' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});



async function insertoGeoJSON(name, type, json) {
    const json_id = insert('json', {
        name: name,
        columns: json[0].keys.length,
        rows: json.length,
        type: type,
        normalized: false,
        created_at: new Date().getTime()

    });

    let ks = {};

    json[0].keys.forEach(el => {
        ks[el] = insert('keys', {
            json_id: json_id,
            name: el,
            nullable: true,
            type: "",
        });
    });

    json.array.forEach(element, i => {
        let row = insert('rows', {
            position: i
        });
        Object.entries(element).forEach(([key, value]) => {
            let row = insert('value', {
                keys_id: ks[key],
                rows_id: row,
                value: value
            });
        });
    });
}


async function insert(tableName, data) {
    data.id = uuidv4();
    const client = new Client(CliData);

    await client.connect();

    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
        const res = await client.query(query, values);
        console.log('Inserted row:', res.rows[0]);
    } catch (err) {
        console.error('Error inserting data:', err);
    } finally {
        await client.end();
    }
    return data.id;
}
