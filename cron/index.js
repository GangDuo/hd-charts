const moment = require('moment');
const DataSource = require('./DataSource');
const CsvFile = require('./CsvFile');

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

function term(n) {
  const pattern = "YYYY-MM-DD"
  const yesterday = () => moment().subtract(1, 'days')
  let beginDate = moment().subtract(n, 'days')
  let endDate = yesterday()

  return {
    beginDate: beginDate.format(pattern),
    endDate: endDate.format(pattern),
    howManyDays: endDate.diff(beginDate, 'days') + 1
  }
}

async function generateDataSet({term, filename}) {
  const {beginDate, endDate, howManyDays} = term()

  const instance = new DataSource()
  const csv = new CsvFile({
    json: await instance.fetch({commandText, beginDate, endDate})
  })
  csv.transform((rows) => {
    const median = Math.floor(howManyDays / 2)
    return rows.reduce((ax, row, i)=>{
      if(i < median) {
        ax.push({"前の期間": row['customer_traffic']})
      } else {
        ax[i - median].x = row['date']
        ax[i - median]["現在の期間"] = row['customer_traffic']
      }
      return ax
    }, [])
  })
  await csv.save(filename)
}

(async function() {
  await Promise.all([{
    term: function(){return term(14)},
    filename: 'week_customer_traffic.csv'
  },{
    term: function(){return term(70)},
    filename: 'month_customer_traffic.csv'
  }].map(async x => await generateDataSet(x)))
})()
