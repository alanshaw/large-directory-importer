import { create } from 'ipfs-http-client'

export async function ipfsParkingLot (source) {
  const ipfs = create()
  for await (const car of source) {
    for await (const _ of ipfs.dag.import([car])) {
    }
  }
}
