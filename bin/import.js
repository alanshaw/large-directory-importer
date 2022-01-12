#!/usr/bin/env node
import { Importer } from '../index.js'
import { Reporter } from '../cli-reporter.js'
import { ipfsParkingLot } from '../ipfs-parking-lot.js'

async function main () {
  const rootDir = process.argv[2]

  if (!rootDir) {
    console.error('missing root directory argument')
    process.exit(1)
  }
  
  const reporter = new Reporter()
  
  try {
    await Importer.start(rootDir, ipfsParkingLot, {
      onProgress: reporter.update.bind(reporter)
    })
    reporter.stop()
  } catch (err) {
    reporter.stop(err)
  }
}

main()
