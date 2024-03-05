// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/**
 * @title DataTypes
 * @author Tomo Protocol
 *
 * @notice A standard library of data types used throughout the XRGB.
 */
library DataTypes {
    struct CreateX404Parameters {
        address nftContractAddr;
        address creator;
        uint256 redeemMaxDeadline;
    }

    struct SwapRouter {
        bool bV2orV3;
        address routerAddr;
        address uniswapV3NonfungiblePositionManager;
    }
}
