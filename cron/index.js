const mysql = require('promise-mysql');
const moment = require('moment');
const fs = require("fs");
const { AsyncParser } = require("json2csv");
const { Readable } = require('stream');

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
    howManyDays: endDate.diff(beginDate, 'days') + 1
  }
}

(async function() {
  const {beginDate, endDate, howManyDays} = term()
  const median = Math.floor(howManyDays / 2)

  const connection = await mysql.createConnection({
    host: process.env.HOST,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  });

  try {
    const rows = await connection.query(commandText, [beginDate, endDate]);
    const source = rows.reduce((ax, row, i)=>{
      if(i < median) {
        ax.push({"前の期間": row['customer_traffic']})
      } else {
        ax[i - median].x = row['date']
        ax[i - median]["現在の期間"] = row['customer_traffic']
      }
      return ax
    }, [])
    console.log(rows)
    console.log(source)
    writeAsCsv({path: "customer_traffic.csv",source: source})
  } catch (e) {
    console.log(e);
  } finally {
    await connection.end();
  }
})()

  async function writeAsCsv(options) {
    options = options || {}
    const dest = options.path ? fs.createWriteStream(options.path, 'utf8') : process.stdout
    const opts = {
      fields: ["x","現在の期間","前の期間"]
    };
    const transformOpts = { readableObjectMode: true, writableObjectMode: true };
    const parser = new AsyncParser(opts, transformOpts);
    const input = new Readable({ objectMode: true });
    input._read = () => {}; // redundant? see update below
    options.source.forEach(item => input.push(item));
    input.push(null);
    const processor = parser.fromInput(input).toOutput(dest);
  
    await processor.promise(false).catch(err => console.error(err));
  }
