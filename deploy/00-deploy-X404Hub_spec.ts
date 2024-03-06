/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ZeroAddress } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { BlueChipNFT__factory, X404Hub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, owner ] = await ethers.getSigners();

  const blueChipNFT = await new BlueChipNFT__factory(deployer).deploy();
  const blueChipNFTAddress = await blueChipNFT.getAddress()
  console.log("blueChipNFTAddress: ", blueChipNFTAddress)

  const swapRouterArray = [
    {
      bV2orV3: false,
      routerAddr: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      uniswapV3NonfungiblePositionManager: '0x1238536071E1c677A632429e3655c799b22cDA52',
    },
  ];
  
  const maxRedeemDeadline = 30 * 24 * 60 * 60;
  const X404Hub = await ethers.getContractFactory("X404Hub");
  const proxy = await upgrades.deployProxy(X404Hub, [deployer.address, maxRedeemDeadline, swapRouterArray]);
  await proxy.waitForDeployment()
  
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
  
  const x404Hub = X404Hub__factory.connect(proxyAddress)
  await x404Hub.connect(deployer).setBlueChipNftContract([blueChipNFTAddress], true)
  console.log("setBlueChipNftContract successful.")
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['X404Hub']

export default deployFn
