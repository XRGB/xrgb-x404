// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {DataTypes} from "../lib/DataTypes.sol";

interface IX404Hub {
    function _parameters()
        external
        view
        returns (address blueChipNft, address creator, uint256 deadline);

    function getForceBuyParam()
        external
        view
        returns (uint256 minimumNftAmount, uint256 ratio);

    function owner() external view returns (address owner);

    function _supportChain(
        uint256 chainId
    ) external view returns (bool bSupport);

    function getSwapRouter()
        external
        view
        returns (DataTypes.SwapRouter[] memory);
}
