import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const connectionString = 'postgresql://neondb_owner:npg_4meOx6FajsTz@ep-polished-pond-adv8w1re-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(connectionString);

async function runMigration() {
  console.log('🔗 Conectando ao Neon...');
  
  try {
    // Test connection
    await sql`SELECT 1 as test`;
    console.log('✅ Conexão OK');
    
    // Read migration SQL
    const migrationSQL = readFileSync('./src/components/settings/SqlMigrationModal.tsx', 'utf-8');
    
    // Extract SQL from the file (between backticks)
    const match = migrationSQL.match(/export const SQL_MIGRATION_SCRIPT = `([\s\S]*?)`;/);
    if (!match) {
      throw new Error('Não foi possível extrair o SQL do arquivo');
    }
    
    const sqlScript = match[1];
    console.log('📄 SQL extraído, executando migração...');
    
    // Split by semicolon and execute each statement
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await sql.unsafe(stmt);
          console.log('✅ Executado:', stmt.substring(0, 60) + '...');
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log('⚠️  Já existe (ignorando):', stmt.substring(0, 60) + '...');
          } else {
            console.error('❌ Erro:', err.message);
            console.error('   Statement:', stmt.substring(0, 100));
          }
        }
      }
    }
    
    // Verify tables created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\n📋 Tabelas criadas:');
    tables.forEach(t => console.log('  -', t.table_name));
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (err) {
    console.error('❌ Falha na migração:', err.message);
    process.exit(1);
  }
}

runMigration();