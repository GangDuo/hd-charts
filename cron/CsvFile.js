const fs = require("fs");
const { AsyncParser } = require("json2csv");
const { Readable } = require('stream');

class CsvFile {
  constructor({json}) {
    this.json = json
  }

  transform(transform) {
    transform = transform || (() => [])
    this.json = transform(this.json)    
  }

  async save(path) {
    await writeAsCsv({path, source: this.json})
  }
}

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

module.exports = CsvFile