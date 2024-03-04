// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library LibCalculatePair {
    function _getUniswapV2Pair(
        address uniswapV2Factory_,
        address tokenA,
        address tokenB
    ) internal pure returns (address) {
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
    ) internal pure returns (address) {
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
}
