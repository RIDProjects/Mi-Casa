const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:rid@localhost:5432/finanzas_db'
});

async function main() {
  try {
    await client.connect();
    const result = await client.query(
      'SELECT id, name, email, "isActive" FROM public.users WHERE email = $1',
      ['admin@finanzas.com']
    );
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
