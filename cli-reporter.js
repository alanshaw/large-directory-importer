import Table from 'cli-table'
import ora from 'ora'
import prettyBytes from 'pretty-bytes'
import formatNumber from 'format-number'

const prettyInt = formatNumber()

export class Reporter {
  getSpinner () {
    if (!this._spinner) {
      this._spinner = ora().start()
    }
    return this._spinner
  }

  update ({
    task,
    rootCid,
    totalSize,
    totalFiles,
    totalCars
  }) {
    const table = new Table({
      head: ['CID', 'Size', 'Files', 'CARs', 'Memory Usage'],
      colWidths: [62, 16, 14, 10, 14]
    })
    table.push([
      rootCid || 'unknown',
      prettyBytes(Number(totalSize)),
      prettyInt(totalFiles),
      prettyInt(totalCars),
      prettyBytes(process.memoryUsage.rss())
    ])
    const spinner = this.getSpinner()
    spinner.text = `${task}\n${table.toString()}`
  }

  stop (err) {
    const spinner = this.getSpinner()
    if (err) {
      spinner.fail(err.message)
    } else {
      spinner.succeed()
    }
  }
}
