const mysql = require('promise-mysql');

const commandText = `
  SELECT 1
;`;

(async function() {
  const connection = await mysql.createConnection({
    host: process.env.HOST,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  });

  try {
    const rows = await connection.query(commandText);
    console.log(rows)
  } catch (e) {
    console.log(e);
  } finally {
    await connection.end();
  }
})()
