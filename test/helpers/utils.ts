
import { hexlify, keccak256, Contract, toUtf8Bytes, TransactionReceipt, TransactionResponse } from 'ethers';
import { encode } from '@ethersproject/rlp'
import { expect } from 'chai';
import { HARDHAT_CHAINID } from './constants';
import hre from 'hardhat';
import { eventsLib } from '../__setup.spec';
import { Events } from '../../typechain-types';

export function getChainId(): number {
  return hre.network.config.chainId || HARDHAT_CHAINID;
}

export function computeContractAddress(deployerAddress: string, nonce: number): string {
  const hexNonce = hexlify(nonce.toString());
  return '0x' + keccak256(encode([deployerAddress, hexNonce])).substr(26);
}

export function findEvent(
  receipt: TransactionReceipt,
  name: string,
  eventContract: Events = eventsLib,
  emitterAddress?: string
) {
  const events = receipt.logs;

  if (events != undefined) {
    // match name from list of events in eventContract, when found, compute the sigHash
    let sigHash: string | undefined;
    if(eventContract.interface.hasEvent(name)) {
      const contractEvent = eventContract.interface.getEvent("X404Created")
      sigHash = contractEvent.topicHash
    }
    // Throw if the sigHash was not found
    if (!sigHash) {
      console.log(
        `Event "${name}" not found in provided contract (default: Events libary). \nAre you sure you're using the right contract?`
      );
    }

    for (const emittedEvent of events) {
      // If we find one with the correct sighash, check if it is the one we're looking for
      if (emittedEvent.topics[0] == sigHash) {
        // If an emitter address is passed, validate that this is indeed the correct emitter, if not, continue
        if (emitterAddress) {
          if (emittedEvent.address != emitterAddress) continue;
        }
        const event = eventContract.interface.parseLog(emittedEvent);
        return event;
      }
    }
    // Throw if the event args were not expected or the event was not found in the logs
    console.log(
      `Event "${name}" not found emitted by "${emitterAddress}" in given transaction log`
    );
  } else {
    console.log('No events were emitted');
  }
}

export async function waitForTx(
  tx: Promise<TransactionResponse> | TransactionResponse,
  skipCheck = false
): Promise<TransactionReceipt> {
  if (!skipCheck) await expect(tx).to.not.be.reverted;
  return (await (await tx).wait())!;
}

export async function getTimestamp(): Promise<any> {
  const blockNumber = await hre.ethers.provider.send('eth_blockNumber', []);
  const block = await hre.ethers.provider.send('eth_getBlockByNumber', [blockNumber, false]);
  return block.timestamp;
}

export async function setNextBlockTimestamp(timestamp: number): Promise<void> {
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
}

let snapshotId: string = '0x1';
export async function takeSnapshot() {
  snapshotId = await hre.ethers.provider.send('evm_snapshot', []);
}

export async function revertToSnapshot() {
  await hre.ethers.provider.send('evm_revert', [snapshotId]);
}