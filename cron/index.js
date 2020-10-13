const moment = require('moment');
const DataSource = require('./DataSource');
const CsvFile = require('./CsvFile');
const QueryBuilder = require('./QueryBuilder');

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

async function generateDataSet({term, ...others}) {
  const {beginDate, endDate, howMany} = term()
  const qb = new QueryBuilder(others)
  const commandText = qb.sql
  const filename = `${qb.termSymbol}_${qb.dataSourceName}.csv`

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
          "現在の期間": row['value']
        })
      } else {
        const lastIndex = ax.length - 1
        const renumbering = i - median
        ax[lastIndex - renumbering]["前の期間"] = row['value']
      }
      return ax
    }, [])
  })
  await csv.save(filename)
}

(async function() {
  await Promise.all([{
    term: function(){return term(14)},
  },{
    term: function(){return term(70)},
    termSymbol: 'month'
  },{
    term: function(){
      return term(23, {
        key: 'months',
        setDate: (ins) => ins.set('date', 1)
      })
    },
    termSymbol: 'year'
  },{
    term: function(){
      return term(19, {
        key: 'years',
        setDate: (ins) => ins.set('date', 1),
        setMonth: (ins) => ins.set('month', 0)
      })
    },
    termSymbol: 'decade'
  },{
    term: function(){return term(14)},
    dataSourceName: 'sales'
  }].map(async x => await generateDataSet(x)))
})()
