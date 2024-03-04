//SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

interface IUniswapV2Router {
    function factory() external view returns (address);

    function WETH() external view returns (address);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}
