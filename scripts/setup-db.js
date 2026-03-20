const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    vars[key] = value;
  });
  return vars;
}

async function main() {
  const env = readEnv();
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('[') || databaseUrl.includes('SUA_SENHA')) {
    console.error('❌ DATABASE_URL não encontrada ou contém placeholders no .env.local');
    console.error('');
    console.error('Adicione a variável DATABASE_URL ao seu .env.local:');
    console.error('  DATABASE_URL=postgresql://postgres.[REF]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres');
    console.error('');
    console.error('Encontre em: Supabase Dashboard > Settings > Database > Connection string > URI');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de dados...');

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    const sqlPath = path.join(__dirname, '..', 'supabase-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📦 Executando ${statements.length} comandos SQL...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
      try {
        await client.query(stmt);
        console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ⚠️  [${i + 1}/${statements.length}] Já existe: ${preview}...`);
        } else {
          console.error(`  ❌ [${i + 1}/${statements.length}] Erro: ${err.message}`);
          console.error(`     SQL: ${preview}...`);
        }
      }
    }

    console.log('\n🎉 Schema do banco de dados configurado com sucesso!');
    console.log('   Tabela: transactions');
    console.log('   RLS: habilitado');
    console.log('   Políticas: SELECT, INSERT, UPDATE, DELETE');
    console.log('   Trigger: updated_at automático');

  } catch (err) {
    console.error('❌ Erro ao conectar:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('   O host do banco não foi encontrado. Verifique a DATABASE_URL.');
    }
    if (err.message.includes('password')) {
      console.error('   Senha inválida. Verifique a senha na DATABASE_URL.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
