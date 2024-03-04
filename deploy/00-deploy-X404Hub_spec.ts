/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ZeroAddress } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { LibCalculate__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, owner ] = await ethers.getSigners();

  const swapRouterArray = [
    {
      bV2orV3: true,
      routerAddr: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniswapV3NonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    },
  ];

  const LibCaculate = await new LibCalculate__factory(deployer).deploy();
  const LibCaculateAddr = await LibCaculate.getAddress();
  
  const maxRedeemDeadline = 30 * 24 * 60 * 60;
  const X404Hub = await ethers.getContractFactory("X404Hub", {
    libraries: {
      LibCalculate: LibCaculateAddr,
    },
  });
  const proxy = await upgrades.deployProxy(X404Hub, [deployer.address, maxRedeemDeadline, swapRouterArray], { unsafeAllowLinkedLibraries: true });
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['X404Hub']

export default deployFn
