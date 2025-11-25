console.log('---------------------------------------------------');
console.log('--- INICIALIZANDO SERVIDOR DO SISTEMA DE SENHAS ---');
console.log('---------------------------------------------------');

// Carrega as variáveis de ambiente do arquivo .env
try {
    require('dotenv').config();
} catch (e) {
    console.log('INFO: Biblioteca dotenv não carregada. Verifique se instalou: npm install dotenv');
}

let express, Pool, cors;
try {
    express = require('express');
    const pg = require('pg');
    Pool = pg.Pool;
    cors = require('cors');
    console.log('✅ Bibliotecas carregadas com sucesso.');
} catch (e) {
    console.error('❌ ERRO CRÍTICO: Falha ao carregar bibliotecas.');
    console.error('Execute no terminal: npm install express pg cors dotenv');
    process.exit(1);
}

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
let pool = null;
let dbReady = false;

// Verifica se existe a string de conexão
const connectionString = process.env.DATABASE_URL;

if (connectionString) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    
    console.log('🔄 Tentando conectar ao Banco de Dados...');
    if (!isLocalhost) {
        console.log('☁️  Detectado ambiente Nuvem (ex: Supabase/Neon/Render). Habilitando SSL.');
    }
    
    pool = new Pool({
        connectionString: connectionString,
        // Configuração SSL Robusta para Supabase
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        // Configuração de Timeout para evitar travamentos na inicialização
        connectionTimeoutMillis: 5000
    });

    pool.connect()
        .then(client => {
            console.log('✅ SUCESSO: Conectado ao Banco de Dados PostgreSQL!');
            
            // Teste rápido para verificar se a tabela existe
            client.query('SELECT count(*) FROM waiting_tickets', (err, res) => {
                if (err) {
                    if (err.code === '42P01') {
                        console.warn('⚠️  ALERTA: Conectado ao banco, mas a tabela "waiting_tickets" não existe.');
                        console.warn('   -> Vá ao SQL Editor do Supabase e rode o script de criação das tabelas.');
                    } else {
                        console.warn('⚠️  Aviso: Erro ao verificar tabelas:', err.message);
                    }
                } else {
                    console.log(`📊 Status: ${res.rows[0].count} senhas registradas no banco.`);
                }
                client.release();
            });

            dbReady = true;
        })
        .catch(err => {
            console.error('❌ ERRO DE CONEXÃO COM O BANCO:');
            console.error(`   Mensagem: ${err.message}`);
            console.error('   -> Verifique se a senha no arquivo .env está correta.');
            console.error('   -> O sistema rodará em MODO MEMÓRIA (sem salvar dados).');
        });
} else {
    console.log('⚠️  AVISO: DATABASE_URL não encontrada no arquivo .env');
    console.log('   -> O sistema rodará em MODO MEMÓRIA.');
}

// Variáveis para Modo Memória (Fallback)
let localWaitList = [];
let localNormalCount = 0;
let localPrefCount = 0;

// --- ROTAS ---

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online',
        mode: dbReady ? 'database' : 'memory',
        message: dbReady ? 'Conectado ao PostgreSQL (Supabase/Local)' : 'Rodando em Memória Temporária',
        timestamp: Date.now()
    });
});

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>Servidor JEC Guarulhos</h1>
            <h2 style="color: ${dbReady ? 'green' : 'orange'}">
                ${dbReady ? '✅ Conectado ao Banco de Dados' : '⚠️ Modo Memória (Sem Banco)'}
            </h2>
            <p>Endpoint API: http://localhost:${port}/api/tickets</p>
        </div>
    `);
});

app.post('/api/tickets', async (req, res) => {
    const { type, service } = req.body;

    if (!type || !service) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    try {
        let ticketNumberStr;

        if (dbReady) {
            // --- MODO BANCO DE DADOS ---
            const sequenceName = type === 'NORMAL' ? 'normal_ticket_sequence' : 'preferential_ticket_sequence';
            
            try {
                // Pega próximo valor da sequência
                const nextValRes = await pool.query(`SELECT nextval('${sequenceName}')`);
                const nextVal = nextValRes.rows[0].nextval;
                
                const prefix = type === 'NORMAL' ? 'N' : 'P';
                ticketNumberStr = `${prefix}${String(nextVal).padStart(3, '0')}`;

                // Insere na tabela
                const insertQuery = `
                    INSERT INTO waiting_tickets (ticket_number, ticket_type, service, status) 
                    VALUES ($1, $2, $3, 'AGUARDANDO') 
                    RETURNING *;
                `;
                const result = await pool.query(insertQuery, [ticketNumberStr, type, service]);
                
                console.log(`[SUPABASE/DB] Nova senha gerada: ${ticketNumberStr} (${service})`);
                return res.status(201).json(result.rows[0]);
                
            } catch (dbError) {
                console.error('Erro SQL:', dbError.message);
                throw dbError;
            }

        } else {
            // --- MODO MEMÓRIA (FALLBACK) ---
            if (type === 'NORMAL') {
                localNormalCount++;
                ticketNumberStr = `N${String(localNormalCount).padStart(3, '0')}`;
            } else {
                localPrefCount++;
                ticketNumberStr = `P${String(localPrefCount).padStart(3, '0')}`;
            }

            const newTicket = {
                id: Date.now(),
                ticket_number: ticketNumberStr,
                ticket_type: type,
                service: service,
                created_at: new Date()
            };
            
            localWaitList.push(newTicket);
            console.log(`[MEMÓRIA] Nova senha: ${ticketNumberStr}`);
            return res.status(201).json(newTicket);
        }

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno ao gerar senha.' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${port}`);
    if (connectionString) {
        console.log(`🔗 Conectando ao banco... aguarde.`);
    }
});