/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import {
  deployAndVerifyAndThen
} from '../scripts/deploy-utils';

const deployFn: DeployFunction = async (hre) => {

  await deployAndVerifyAndThen({
      hre,
      name: "X404Hub",
      contract: 'X404Hub',
      args: [],
  })
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['X404Hub']

export default deployFn
