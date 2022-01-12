import { CID } from 'multiformats'

interface Stats {
  task: string
  rootCid: CID | undefined
  totalSize: bigint
  totalFiles: number
  totalCars: number
}
