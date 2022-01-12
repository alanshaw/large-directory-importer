import { pipe } from 'it-pipe'
import readdirp from 'readdirp'
import { UnixFsDir, UnixFsFile } from 'ipfs-unixfs-builder'
import { sep } from 'path'
import fs from 'fs'
import { CarWriter } from '@ipld/car'
import { CID } from 'multiformats/cid'

const DEFAULT_TARGET_CAR_SIZE = 1024 * 1024 * 1000
const DEFAULT_MAX_FILES_PER_CAR = 100000

const emptyCid = CID.parse('bafkqaaa')

const readdirpOptions = {
  depth: Infinity,
  type: 'files',
  alwaysStat: true,
  fileFilter: ['!.*']
}

export class Importer {
  /**
   * @param {string} rootPath
   * @param {(source: AsyncIterable<Uint8Array>) => Promise<void>} parkingLot 
   * @param {Object} [options]
   * @param {(stats: import('./bindings.d').Stats) => void} [options.onProgress]
   */
  static async start (rootPath, parkingLot, options = {}) {
    const onProgress  = options.onProgress || (() => {})
    const rootDir = new UnixFsDir('root')

    let task = `Reading from directory: ${rootPath}`
    let rootCid
    let totalSize = 0n
    let totalFiles = 0
    let totalCars = 0

    const getStats = () => ({
      task,
      rootCid,
      totalSize,
      totalFiles,
      totalCars
    })

    onProgress(getStats())

    let currentSize = 0
    let currentFiles = 0

    await pipe(
      readdirp(rootPath, readdirpOptions),
      async function * (source) {
        for await (const entryInfo of source) {
          if (!entryInfo.stats.isFile()) {
            console.warn(`ignoring non file/directory: ${entryInfo.path}`)
            continue
          }

          const cwd = getDirectory(rootDir, entryInfo.path)
          cwd.append(new UnixFsFile({
            name: entryInfo.basename,
            size: entryInfo.stats.size,
            stream: () => fs.createReadStream(entryInfo.fullPath)
          }))

          task = `Adding: ${entryInfo.path}`
          totalFiles++
          totalSize += BigInt(entryInfo.stats.size)
          currentFiles++
          currentSize += entryInfo.stats.size

          onProgress(getStats())

          if (currentSize >= DEFAULT_TARGET_CAR_SIZE || currentFiles >= DEFAULT_MAX_FILES_PER_CAR) {
            task = 'Flushing'
            onProgress(getStats())
            yield { blocks: rootDir.flush() }
            currentFiles = 0
            currentSize = 0
          }
        }

        if (currentFiles) {
          task = 'Flushing'
          onProgress(getStats())
          yield { blocks: rootDir.flush() }
        }
      },
      async function * (source) {
        for await (const partial of source) {
          const { writer, out } = CarWriter.create(emptyCid)

          ;(async () => {
            try {
              let b
              for await (b of partial.blocks) {
                await writer.put(b)
              }
              rootCid = b.cid
              onProgress(getStats())
            } finally {
              await writer.close()
            }
          })()

          task = 'Parking CAR'
          totalCars++
          onProgress(getStats())
          yield out
          // TODO: wait for CAR to be consumed fully before continuing
        }

        const { writer, out } = CarWriter.create(rootCid)
        writer.close()
        yield out
      },
      parkingLot
    )
  }
}

/**
 * @param {UnixFsDir} rootDir
 * @param {string} filePath
 */
function getDirectory (rootDir, filePath) {
  let curr = rootDir
  for (const part of filePath.split(sep).slice(0, -1)) {
    let next = curr.entries.find(d => d.name === part)
    if (!next) {
      next = new UnixFsDir(part)
      curr.append(next)
    }
    curr = next
  }
  return curr
}
