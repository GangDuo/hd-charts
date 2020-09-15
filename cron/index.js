const mysql = require('promise-mysql');
const moment = require('moment');

const commandText = `
  SELECT DATE_FORMAT(\`date\`, '%Y-%m-%d') AS \`date\`,
         DAYOFWEEK(\`date\`) AS 'day_of_week',
         count(publicID) AS customer_traffic
    FROM TJournals
   WHERE (\`date\` BETWEEN ? AND ?)
     AND (storeCD IN(SELECT code FROM stores WHERE isDM))
GROUP BY DATE_FORMAT(\`date\`, '%Y-%m-%d'),
         DAYOFWEEK(\`date\`)
;`;

function term() {
  const pattern = "YYYY-MM-DD"
  const yesterday = () => moment().subtract(1, 'days')
  let beginDate = moment().subtract(14, 'days')
  let endDate = yesterday()

  return {
    beginDate: beginDate.format(pattern),
    endDate: endDate.format(pattern),
  }
}

(async function() {
  const {beginDate, endDate} = term()

  const connection = await mysql.createConnection({
    host: process.env.HOST,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  });

  try {
    const rows = await connection.query(commandText, [beginDate, endDate]);
    console.log(rows)
  } catch (e) {
    console.log(e);
  } finally {
    await connection.end();
  }
})()
