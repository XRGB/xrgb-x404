//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";

contract MockUniswapV2Router02 is IUniswapV2Router {
    address public immutable override factory;
    address public immutable override WETH;

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }
}
