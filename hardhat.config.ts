import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from 'dotenv'
import 'hardhat-deploy'
dotenv.config()

const deployer = process.env.DEPLOY_PRIVATE_KEY || '0x' + '11'.repeat(32)
const owner = process.env.OWNER_PRIVATE_KEY || '0x' + '11'.repeat(32)
const BASE_BLOCK_EXPLORER_KEY = process.env.BASE_BLOCK_EXPLORER_KEY || '';
const ETHEREUM_BLOCK_EXPLORER_KEY = process.env.ETHEREUM_BLOCK_EXPLORER_KEY || '';
const LINEA_BLOCK_EXPLORER_KEY = process.env.LINEA_BLOCK_EXPLORER_KEY || '';
const BNB_BLOCK_EXPLORER_KEY = process.env.BNB_BLOCK_EXPLORER_KEY || '';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 20,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      gas: 29000000,
    },
    bsc: {
      chainId: 56,
      url: process.env.BSC_MAINNET_RPC_URL || '',
      accounts: [deployer, owner],
    },
    linea_mainnet: {
      chainId: 59144,
      url: process.env.LINEA_RPC_URL || '',
      accounts: [deployer, owner],
    },
    linea_testnet: {
      chainId: 59140,
      url: process.env.LINEA_TESTNET_RPC_URL || '',
      accounts: [deployer, owner],
    },
    baseMain: {
      chainId: 8453,
      url: process.env.BASE_MAIN_RPC_URL || '',
      accounts: [deployer, owner],
    },
    baseSepolia: {
      chainId: 84532,
      url: process.env.BASE_TEST_RPC_URL || '',
      accounts: [deployer, owner],
    },
    mainnet: {
      chainId: 1,
      url: process.env.ETH_MAINNET_RPC_URL || '',
      accounts: [deployer, owner],
    },
    goerli: {
      chainId: 5,
      url: process.env.GOERLI_RPC_URL || '',
      accounts: [deployer, owner],
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: [deployer, owner],
    },
    bscTestnet: {
      chainId: 97,
      url: process.env.BSC_TESETNET_RPC_URL || '',
      accounts: [deployer, owner],
    },
  },
  gasReporter: {
  	enabled: false,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 1,
    }
  },
  etherscan: {
    apiKey: {
      goerli: ETHEREUM_BLOCK_EXPLORER_KEY,
      baseSepolia: BASE_BLOCK_EXPLORER_KEY,
      baseMainnet: BASE_BLOCK_EXPLORER_KEY,
      linea_mainnet: LINEA_BLOCK_EXPLORER_KEY,
      linea_tesetnet: LINEA_BLOCK_EXPLORER_KEY,
      bscTestnet: BNB_BLOCK_EXPLORER_KEY,
      bsc: BNB_BLOCK_EXPLORER_KEY,
      mainnet: ETHEREUM_BLOCK_EXPLORER_KEY,
      sepolia: ETHEREUM_BLOCK_EXPLORER_KEY
    },
    customChains: [
      {
        network: "linea_mainnet",
        chainId: 59144,
        urls: {
         apiURL: "https://api.lineascan.build/api",
         browserURL: "https://lineascan.build/"
        }
      },
      {
        network: "linea_tesetnet",
        chainId: 59140,
        urls: {
         apiURL: "https://api-goerli.lineascan.build/api",
         browserURL: "https://goerli.lineascan.build/"
        }
      },
      {
        network: "baseMainnet",
        chainId: 8453,
        urls: {
         apiURL: "https://api.basescan.org/api",
         browserURL: "https://basescan.org"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
         apiURL: "https://api-sepolia.basescan.org/api",
         browserURL: "https://sepolia.basescan.org/"
        }
      }
    ]
  }
};

export default config;
