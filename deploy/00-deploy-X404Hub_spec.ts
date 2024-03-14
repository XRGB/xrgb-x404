/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ZeroAddress } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { X404Hub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, owner ] = await ethers.getSigners();

  const swapRouterArray = [
    //eth-mainnet
    {
      bV2orV3: true,
      routerAddr: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      uniswapV3NonfungiblePositionManager: ZeroAddress,
    },
    {
      bV2orV3: false,
      routerAddr: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniswapV3NonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    },
  ];
  
  const maxRedeemDeadline = 180 * 24 * 60 * 60;
  const X404Hub = await ethers.getContractFactory("X404Hub");
  const proxy = await upgrades.deployProxy(X404Hub, [deployer.address, maxRedeemDeadline, swapRouterArray]);
  await proxy.waitForDeployment()
  
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
  
  const blue_chip_addresses = [
    '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8', //PudgyPenguins (PPG)
    '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', //BoredApeYachtClub (BAYC)
    '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', //MutantApeYachtClub (MAYC) C URL
    '0x524cAB2ec69124574082676e6F654a18df49A048', //LilPudgys (LP)  C URL
    '0x8821BeE2ba0dF28761AffF119D66390D594CD280', //DeGods (DEGODS) upgrade contract & C URL
    '0x23581767a106ae21c074b2276D25e5C3e136a68b', //Moonbirds (MOONBIRD)  C URL
    '0xED5AF388653567Af2F388E6224dC7C4b3241C544', //Azuki (AZUKI)
    '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e', //Doodles (DOODLE)
    '0x59468516a8259058baD1cA5F8f4BFF190d30E066'  //Invisible Friends (INVSBLE)
  ]
  const x404Hub = X404Hub__factory.connect(proxyAddress)
  await x404Hub.connect(deployer).setBlueChipNftContract(blue_chip_addresses, true)
  console.log("setBlueChipNftContract successful.")
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['DeployX404Hub']

export default deployFn
