// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {DataTypes} from "../lib/DataTypes.sol";

interface IX404Hub {
    function _parameters()
        external
        view
        returns (address blueChipNft, address creator, uint256 deadline);

    function owner() external view returns (address owner);

    function getSwapRouter()
        external
        view
        returns (DataTypes.SwapRouter[] memory);
}
