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

function term(n, options) {
  options = options || {}
  const key = options.key || 'days'
  const setDate = options.setDate || (ins => ins)
  const setMonth = options.setMonth || (ins => ins)
  const pattern = "YYYY-MM-DD"
  const yesterday = () => moment().subtract(1, 'days')
  let beginDate = setMonth(setDate(moment().subtract(n, key)))
  let endDate = yesterday()

  return {
    beginDate: beginDate.format(pattern),
    endDate: endDate.format(pattern),
    howMany: endDate.diff(beginDate, key) + 1,
    key
  }
}

async function generateDataSet({term, filename, commandText}) {
  const {beginDate, endDate, howMany} = term()

  const instance = new DataSource()
  const csv = new CsvFile({
    json: await instance.fetch({commandText, beginDate, endDate})
  })
  csv.transform((rows) => {
    const median = Math.floor(howMany / 2)
    return rows.reverse().reduce((ax, row, i)=>{
      if(i < median) {
        ax.unshift({
          x: row['date'],
          "現在の期間": row['customer_traffic']
        })
      } else {
        const lastIndex = ax.length - 1
        const renumbering = i - median
        ax[lastIndex - renumbering]["前の期間"] = row['customer_traffic']
      }
      return ax
    }, [])
  })
  await csv.save(filename)
}

(async function() {
  await Promise.all([{
    term: function(){return term(14)},
    filename: 'week_customer_traffic.csv',
    commandText
  },{
    term: function(){return term(70)},
    filename: 'month_customer_traffic.csv',
    commandText
  },{
    term: function(){
      return term(23, {
        key: 'months',
        setDate: (ins) => ins.set('date', 1)
      })
    },
    filename: 'year_customer_traffic.csv',
    commandText: `
    SELECT DATE_FORMAT(\`date\`, '%Y-%m-01') AS \`date\`,
           count(publicID) AS customer_traffic
      FROM TJournals
     WHERE (\`date\` BETWEEN ? AND ?)
       AND (storeCD IN(SELECT code FROM stores WHERE isDM))
  GROUP BY DATE_FORMAT(\`date\`, '%Y-%m-01')
  ;`
  },{
    term: function(){
      return term(19, {
        key: 'years',
        setDate: (ins) => ins.set('date', 1),
        setMonth: (ins) => ins.set('month', 0)
      })
    },
    filename: 'decade_customer_traffic.csv',
    commandText: `
    SELECT DATE_FORMAT(\`date\`, '%Y-01-01') AS \`date\`,
           count(publicID) AS customer_traffic
      FROM TJournals
     WHERE (\`date\` BETWEEN ? AND ?)
       AND (storeCD IN(SELECT code FROM stores WHERE isDM))
  GROUP BY DATE_FORMAT(\`date\`, '%Y-01-01')
  ;`
  }].map(async x => await generateDataSet(x)))
})()
