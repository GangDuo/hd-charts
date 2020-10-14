const mysql = require('promise-mysql');

class DataSource {
  async fetch({commandText, beginDate, endDate}) {
    const connection = await mysql.createConnection({
      host: process.env.HOST,
      port: process.env.PORT,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
    });
  
    try {
      this.rows = await connection.query(commandText, [beginDate, endDate]);
    } catch (e) {
      this.rows = []
      console.log(e);
    } finally {
      await connection.end();
    }
    return this.rows
  }
}

module.exports = DataSource