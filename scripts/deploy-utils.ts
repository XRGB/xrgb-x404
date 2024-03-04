import { ethers, Contract, ContractTransaction } from 'ethers'
import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { splitSignature } from '@ethersproject/bytes'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import hre from 'hardhat';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deployContract(tx: any): Promise<Contract> {
  const result = await tx;
  await result.deployTransaction.wait();
  return result;
}

export async function deployWithVerify(
  tx: any,
  args: any,
  contractPath: string
): Promise<Contract> {
  const deployedContract = await deployContract(tx);
  let count = 0;
  let maxTries = 8;
  const runtimeHRE = require('hardhat');
  while (true) {
    await delay(10000);
    try {
      console.log('Verifying contract at', deployedContract.address);
      await runtimeHRE.run('verify:verify', {
        address: deployedContract.address,
        constructorArguments: args,
        contract: contractPath,
      });
      break;
    } catch (error) {
      if (String(error).includes('Already Verified')) {
        console.log(
          `Already verified contract at ${contractPath} at address ${deployedContract.address}`
        );
        break;
      }
      if (++count == maxTries) {
        console.log(
          `Failed to verify contract at ${contractPath} at address ${deployedContract.address}, error: ${error}`
        );
        break;
      }
      console.log(`Retrying... Retry #${count}, last error: ${error}`);
    }
  }

  return deployedContract;
}

/**
 * @param  {Any} hre Hardhat runtime environment
 * @param  {String} name Contract name from the names object
 * @param  {Any[]} args Constructor arguments
 * @param  {String} contract Name of the solidity contract
 * @param  {String} iface Alternative interface for calling the contract
 * @param  {Function} postDeployAction Called after deployment
 */

export const deployAndVerifyAndThen = async ({
  hre,
  name,
  args,
  contract,
  iface,
  postDeployAction,
}: {
  hre: any
  name: string
  args: any[]
  contract?: string
  iface?: string
  postDeployAction?: (contract: Contract) => Promise<void>
}) => {
  const { deploy } = hre.deployments
  const { deployer } = await hre.getNamedAccounts()

  const result = await deploy(name, {
    contract,
    from: deployer,
    args,
    log: true,
  })

  if (result.newlyDeployed) {
    if (!(await isHardhatNode(hre))) {
      // Verification sometimes fails, even when the contract is correctly deployed and eventually
      // verified. Possibly due to a race condition. We don't want to halt the whole deployment
      // process just because that happens.
      let count = 0;
      let maxTries = 8;
      while (true) {
        await delay(2000);
        try {
          console.log('Verifying contract at', result.address);
          await hre.run('verify:verify', {
            address: result.address,
            constructorArguments: args,
          });
          break;
        } catch (error) {
          if (String(error).includes('Already Verified')) {
            console.log(
              `Already verified contract at address ${result.address}`
            );
            break;
          }
          if (++count == maxTries) {
            console.log(
              `Failed to verify contract at address ${result.address}, error: ${error}`
            );
            break;
          }
          console.log(`Retrying... Retry #${count}, last error: ${error}`);
        }
      }
    }
    if (postDeployAction) {
      const signer = hre.ethers.provider.getSigner(deployer)
      let abi = result.abi
      if (iface !== undefined) {
        const factory = await hre.ethers.getContractFactory(iface)
        abi = factory.interface
      }
      await postDeployAction(
        getAdvancedContract({
          hre,
          contract: new Contract(result.address, abi, signer),
        })
      )
    }
  }
}

// Returns a version of the contract object which modifies all of the input contract's methods to:
// 1. Waits for a confirmed receipt with more than deployConfig.numDeployConfirmations confirmations.
// 2. Include simple resubmission logic, ONLY for Kovan, which appears to drop transactions.
export const getAdvancedContract = (opts: {
  hre: any
  contract: Contract
}): Contract => {
  // Temporarily override Object.defineProperty to bypass ether's object protection.
  const def = Object.defineProperty
  Object.defineProperty = (obj, propName, prop) => {
    prop.writable = true
    return def(obj, propName, prop)
  }

  const contract = new Contract(
    opts.contract.target,
    opts.contract.interface,
    opts.contract.runner
  )

  // Now reset Object.defineProperty
  Object.defineProperty = def

  // Override each function call to also `.wait()` so as to simplify the deploy scripts' syntax.
  // for (const fnName of Object.keys(contract.functions)) {
  //   const fn = contract[fnName].bind(contract)
  //   ;(contract as any)[fnName] = async (...args: any) => {
  //     // We want to use the gas price that has been configured at the beginning of the deployment.
  //     // However, if the function being triggered is a "constant" (static) function, then we don't
  //     // want to provide a gas price because we're prone to getting insufficient balance errors.
  //     let gasPrice = undefined //opts.hre.deployConfig.gasPrice || undefined
  //     // if (contract.interface.getFunction(fnName).constant) {
  //     //   gasPrice = 0
  //     // }

  //     const tx = await fn(...args, {
  //       gasPrice,
  //     })

  //     if (typeof tx !== 'object' || typeof tx.wait !== 'function') {
  //       return tx
  //     }

  //     // Special logic for:
  //     // (1) handling confirmations
  //     // (2) handling an issue on Kovan specifically where transactions get dropped for no
  //     //     apparent reason.
  //     const maxTimeout = 120
  //     let timeout = 0
  //     while (true) {
  //       //await sleep(1000)
  //       const receipt = await contract.provider.getTransactionReceipt(tx.hash)
  //       if (receipt === null) {
  //         timeout++
  //         if (timeout > maxTimeout && opts.hre.network.name === 'kovan') {
  //           // Special resubmission logic ONLY required on Kovan.
  //           console.log(
  //             `WARNING: Exceeded max timeout on transaction. Attempting to submit transaction again...`
  //           )
  //           return contract[fnName](...args)
  //         }
  //       } else if (
  //         receipt.confirmations >= 0
  //       ) {
  //         return tx
  //       }
  //     }
  //   }
  // }

  return contract
}

export const getContractFromArtifact = async (
  hre: any,
  name: string,
  options: {
    iface?: string
    signerOrProvider?: Signer | Provider | string
  } = {}
): Promise<ethers.Contract> => {
  const artifact = await hre.deployments.get(name)
  await hre.ethers.provider.waitForTransaction(artifact.receipt.transactionHash)

  // Get the deployed contract's interface.
  let iface = new hre.ethers.Interface(artifact.abi)
  // Override with optional iface name if requested.
  if (options.iface) {
    const factory = await hre.ethers.getContractFactory(options.iface)
    iface = factory.interface
  }

  let signerOrProvider: Signer | Provider = hre.ethers.provider
  if (options.signerOrProvider) {
    if (typeof options.signerOrProvider === 'string') {
      signerOrProvider = hre.ethers.provider.getSigner(options.signerOrProvider)
    } else {
      signerOrProvider = options.signerOrProvider
    }
  }

  return getAdvancedContract({
    hre,
    contract: new hre.ethers.Contract(
      artifact.address,
      iface,
      signerOrProvider
    ),
  })
}

export const isHardhatNode = async (hre: HardhatRuntimeEnvironment) => {
  const chainId = hre.network.config.chainId;
  return chainId === 31337
}

export const getTomoImplAddr = async (hre: HardhatRuntimeEnvironment) =>  {
  const chainId = hre.network.config.chainId;
  if(chainId === 59140){
    return process.env.TOMO_ADDRESS_LINEA_TESTNET  || ''
  }else if(chainId === 59144){
    return process.env.TOMO_ADDRESS_LINEA_MAINNET || ''
  }
  return ''
}

export async function waitForTx(tx: Promise<ContractTransaction>) {
  (await tx);
}

export function getChainId(): number {
  return hre.network.config.chainId || 31337;
}

export async function buildTransferSeparator(
  tomo: string,
  name: string,
  subject: string,
  from: string,
  to: string,
  amount: number
): Promise<{ v: number; r: string; s: string }> {
  const msgParams = buildTransferKeyParams(tomo, name, subject, from, to, amount);
  return await getSig(msgParams);
}

const buildTransferKeyParams = (
  tomo: string,
  name: string,
  subject: string,
  from: string,
  to: string,
  amount: number
) => ({
  types: {
    TransferKey: [
      { name: 'subject', type: 'address' },
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  domain: {
    name: name,
    version: '1',
    chainId: getChainId(),
    verifyingContract: tomo,
  },
  value: {
    subject: subject,
    from: from,
    to: to,
    amount: amount,
  },
});

export async function buildBuyStandardKeySeparator(
  tomo: string,
  name: string,
  subject: string,
  userAddress: string,
  amount: number
): Promise<{ v: number; r: string; s: string }> {
  const msgParams = buildBuyStandardKeyParams(tomo, name, subject, userAddress, amount);
  return await getSig(msgParams);
}

const buildBuyStandardKeyParams = (
  tomo: string,
  name: string,
  subject: string,
  userAddress: string,
  amount: number
) => ({
  types: {
    BuyStandardKey: [
      { name: 'subject', type: 'address' },
      { name: 'sender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  domain: {
    name: name,
    version: '1',
    chainId: getChainId(),
    verifyingContract: tomo,
  },
  value: {
    subject: subject,
    sender: userAddress,
    amount: amount,
  },
});

export async function buildBuySeparator(
  tomo: string,
  name: string,
  subject: string,
  userAddress: string,
  amount: number
): Promise<{ v: number; r: string; s: string }> {
  const msgParams = buildBuyKeyParams(tomo, name, subject, userAddress, amount);
  return await getSig(msgParams);
}

const buildBuyKeyParams = (
  tomo: string,
  name: string,
  subject: string,
  userAddress: string,
  amount: number
) => ({
  types: {
    BuyKey: [
      { name: 'subject', type: 'address' },
      { name: 'sender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  domain: {
    name: name,
    version: '1',
    chainId: getChainId(),
    verifyingContract: tomo,
  },
  value: {
    subject: subject,
    sender: userAddress,
    amount: amount,
  },
});

const SIGN_PRIVATEKEY = "0xc7bc9e504b5c02fb9b7ef50e1bc4eb7d740010b05591cb4d9cddcf16d402788f"
async function getSig(msgParams: {
  domain: any;
  types: any;
  value: any;
}): Promise<{ v: number; r: string; s: string }> {
  const signWallet = new ethers.Wallet(SIGN_PRIVATEKEY);
  const sig = await signWallet.signTypedData(msgParams.domain, msgParams.types, msgParams.value);
  return splitSignature(sig);
}

// Large balance to fund accounts with.
export const BIG_BALANCE = ethers.MaxUint256
