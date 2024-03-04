// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {DataTypes} from "./DataTypes.sol";
import {IUniswapV3PoolState} from "../interfaces/IUniswapV3PoolState.sol";
import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";
import {IPeripheryImmutableState} from "../interfaces/IPeripheryImmutableState.sol";

library LibCalculate {
    function _getUniswapV2Pair(
        address uniswapV2Factory_,
        address tokenA,
        address tokenB
    ) public pure returns (address) {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                hex"ff",
                                uniswapV2Factory_,
                                keccak256(abi.encodePacked(token0, token1)),
                                hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"
                            )
                        )
                    )
                )
            );
    }

    function _getUniswapV3Pair(
        address uniswapV3Factory_,
        address tokenA,
        address tokenB,
        uint24 fee_
    ) public pure returns (address) {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                hex"ff",
                                uniswapV3Factory_,
                                keccak256(abi.encode(token0, token1, fee_)),
                                hex"e34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54"
                            )
                        )
                    )
                )
            );
    }

    function _getHighestPriceFromSwap(
        uint256 amountIn,
        DataTypes.SwapRouter[] memory swapRouterStruct
    ) public view returns (uint256 tokenWethAmountPrice) {
        address thisAddress = address(this);
        for (uint i = 0; i < swapRouterStruct.length; ) {
            address routerAddr = swapRouterStruct[i].routerAddr;
            if (swapRouterStruct[i].bV2orV3) {
                address weth_ = IUniswapV2Router(routerAddr).WETH();
                address swapFactory = IUniswapV2Router(routerAddr).factory();
                address pair = _getUniswapV2Pair(
                    swapFactory,
                    thisAddress,
                    weth_
                );
                if (pair.code.length > 0) {
                    address[] memory path = new address[](2);
                    path[0] = thisAddress;
                    path[1] = weth_;
                    uint256 ethAmount = _calculateTokenAmountInETH(
                        routerAddr,
                        path,
                        amountIn
                    );
                    if (ethAmount > tokenWethAmountPrice) {
                        tokenWethAmountPrice = ethAmount;
                    }
                }
            } else {
                address weth_ = IPeripheryImmutableState(routerAddr).WETH9();
                address swapFactory = IPeripheryImmutableState(routerAddr)
                    .factory();
                uint256 ethAmount = _getHighestPriceFromV3Swap(
                    amountIn,
                    swapFactory,
                    thisAddress,
                    weth_
                );
                if (ethAmount > tokenWethAmountPrice) {
                    tokenWethAmountPrice = ethAmount;
                }
            }
        }
    }

    function _getHighestPriceFromV3Swap(
        uint256 amountIn,
        address swapFactory,
        address tokenA,
        address tokenB
    ) public view returns (uint256 ethAmount) {
        uint24[4] memory feeTiers = [
            uint24(100),
            uint24(500),
            uint24(3_000),
            uint24(10_000)
        ];

        for (uint256 i = 0; i < feeTiers.length; ) {
            address v3PairAddr = _getUniswapV3Pair(
                swapFactory,
                tokenA,
                tokenB,
                feeTiers[i]
            );

            if (v3PairAddr.code.length > 0) {
                (uint160 currentPrice, , , , , , ) = IUniswapV3PoolState(
                    v3PairAddr
                ).slot0();
                uint256 price = (currentPrice / (2 ** 96)) ** 2;
                if (tokenA < tokenB) {
                    ethAmount = price * amountIn;
                } else {
                    ethAmount = amountIn / price;
                }
            }
            unchecked {
                ++i;
            }
        }
    }

    function _calculateTokenAmountInETH(
        address router,
        address[] memory path,
        uint256 amount
    ) public view returns (uint256) {
        try IUniswapV2Router(router).getAmountsOut(amount, path) returns (
            uint[] memory amountsOut
        ) {
            return amountsOut[1];
        } catch {
            return 0;
        }
    }
}
