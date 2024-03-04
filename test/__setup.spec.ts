
import { expect } from 'chai';
import { Signer, ZeroAddress, AbiCoder } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import {
  X404Hub__factory,
  X404Hub,
  Events,
  Events__factory,
  MockUniswapV2Router02__factory
} from '../typechain-types';
import {
  revertToSnapshot,
  takeSnapshot
} from './helpers/utils';

export let accounts: Signer[];
export let deployer: Signer;
export let owner: Signer;
export let user: Signer;
export let userTwo: Signer;
export let deployerAddress: string;
export let ownerAddress: string;
export let userAddress: string;
export let userTwoAddress: string;
export let x404Hub: X404Hub;
export let eventsLib: Events;
export let abiCoder = AbiCoder.defaultAbiCoder();

export const decimals = 18;
export let yestoday = parseInt((new Date().getTime() / 1000 ).toFixed(0)) - 24 * 3600
export let now = parseInt((new Date().getTime() / 1000 ).toFixed(0))
export let tomorrow2 = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 2 * 24 * 3600
export let tomorrow = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 24 * 3600
export let nftUnits = 10000

export function makeSuiteCleanRoom(name: string, tests: () => void) {
  describe(name, () => {
    beforeEach(async function () {
      await takeSnapshot();
    });
    tests();
    afterEach(async function () {
      await revertToSnapshot();
    });
  });
}

before(async function () {
  abiCoder = AbiCoder.defaultAbiCoder();
  accounts = await ethers.getSigners();
  deployer = accounts[0];
  owner = accounts[3];
  user = accounts[1];
  userTwo = accounts[2];

  deployerAddress = await deployer.getAddress();
  userAddress = await user.getAddress();
  userTwoAddress = await userTwo.getAddress();
  ownerAddress = await owner.getAddress();

  const factoryAddr = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  const routerContract = await new MockUniswapV2Router02__factory(deployer).deploy(factoryAddr, WETH);
  const routerAddr = await routerContract.getAddress();

  const swapRouterArray = [
    {
      bV2orV3: true,
      routerAddr: routerAddr,
      uniswapV3NonfungiblePositionManager: ZeroAddress,
    },
  ];
  
  const X404Hub = await ethers.getContractFactory("X404Hub");
  const proxy = await upgrades.deployProxy(X404Hub, [ownerAddress, 24 * 60 * 60, swapRouterArray]);
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
  x404Hub = X404Hub__factory.connect(proxyAddress)
  await expect(x404Hub.connect(deployer).setBlueChipNftContract([ownerAddress], true)).to.be.reverted
  await expect(x404Hub.connect(deployer).setSwapRouter([])).to.be.reverted
  await expect(x404Hub.connect(deployer).setNewRedeemDeadline(10000)).to.be.reverted
  await expect(x404Hub.connect(deployer).setContractURI(ownerAddress, "as")).to.be.reverted
  await expect(x404Hub.connect(deployer).setTokenURI(ownerAddress, "asd")).to.be.reverted


  eventsLib = await new Events__factory(deployer).deploy();
});
