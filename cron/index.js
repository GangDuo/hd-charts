const moment = require('moment');
const DataSource = require('./DataSource');
const CsvFile = require('./CsvFile');
const QueryBuilder = require('./QueryBuilder');

const terms = {
  week: () => {return term(14)},
  month: () => {return term(70)},
  year: () => {
    return term(23, {
      key: 'months',
      setDate: (ins) => ins.set('date', 1)
    })
  },
  decade: () => {
    return term(19, {
      key: 'years',
      setDate: (ins) => ins.set('date', 1),
      setMonth: (ins) => ins.set('month', 0)
    })
  },
}

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

async function generateDataSet({...others}) {
  const qb = new QueryBuilder(others)
  const commandText = qb.sql
  const filename = `${qb.termSymbol}_${qb.dataSourceName}.csv`
  const {beginDate, endDate, howMany} = terms[qb.termSymbol].call()

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
  const generateTuple = termSymbol => {
    return ['customer_traffic', 'sales', 'average_spending_per_customer'].map(dataSourceName => {
      return {dataSourceName, termSymbol}
    })
  }
  const ax = ['week', 'month'].map(generateTuple)
  // 非力なコンピュータで並列処理すると熱暴走するため分割処理
  const bx = ['year', 'decade'].flatMap(generateTuple)
  const cx = ax.concat(bx)
  for (let i = 0; i < cx.length; i++) {
    const xs = cx[i];
    console.log(xs)
    if(Array.isArray(xs)) {
      await Promise.all(xs.map(async x => await generateDataSet(x)))
    } else {
      await generateDataSet(xs)
    }
    console.log('finish.')
  }
})()
