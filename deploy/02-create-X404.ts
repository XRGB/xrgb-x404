/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import { BlueChipNFT__factory, X404Hub__factory } from '../typechain-types';
import { isHardhatNode } from '../scripts/deploy-utils';

const deployFn: DeployFunction = async (hre) => {
  //if(await isHardhatNode(hre)){
    const [ deployer, owner ] = await ethers.getSigners();

    const proxyAddress = "0x16be924A3AF57E1c293818894810b591aDFf82b1"

    const blueChipNFTAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
    
    const x404Hub = X404Hub__factory.connect(proxyAddress)
    const tokenUri = ''

    const tx = await x404Hub.connect(deployer).createX404(blueChipNFTAddress)
    tx.wait();
    console.log("createX404 successful.")

    const x404Addr = await x404Hub.connect(deployer)._x404Contract(blueChipNFTAddress)
    console.log("x404Addr: ", x404Addr)

    const tx2 = await x404Hub.connect(deployer).setTokenURI(blueChipNFTAddress, tokenUri)
    tx2.wait();
    console.log("setTokenURI successful.")
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['CreateX404']

export default deployFn
