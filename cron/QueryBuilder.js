const dateFormatByTermSymbol = {
  week: '%Y-%m-%d',
  month: '%Y-%m-%d',
  year: '%Y-%m-01',
  decade: '%Y-01-01',
}

class QueryBuilder {
  constructor(options) {
    const {dataSourceName, termSymbol} = Object.assign({
      dataSourceName: 'customer_traffic',
      termSymbol: 'week'
    }, options)
    this.dataSourceName_ = dataSourceName
    this.termSymbol_ = termSymbol

    switch(dataSourceName) {
      case 'sales':
        this.select = 'SUM(sales_without_tax) AS value'
        break
      case 'average_spending_per_customer':
        this.select = 'SUM(sales_without_tax) / COUNT(publicID) AS value'
        break
      case 'customer_traffic':/* through */
      default:
        this.select = 'COUNT(publicID) AS value'
        break
    }
    this.dateFormat = dateFormatByTermSymbol[termSymbol] || '%Y-%m-%d'
  }

  get dataSourceName() {return this.dataSourceName_}
  get termSymbol() {return this.termSymbol_}

  get sql() {
    return `
    SELECT DATE_FORMAT(\`date\`, '${this.dateFormat}') AS \`date\`,
           ${this.select}
      FROM TJournals
     WHERE (\`date\` BETWEEN ? AND ?)
       AND (storeCD IN(SELECT code FROM stores WHERE isDM))
  GROUP BY DATE_FORMAT(\`date\`, '${this.dateFormat}')
  ;`
  }
}

module.exports = QueryBuilder