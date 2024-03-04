// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library Events {
    event X404Created(
        address indexed addr,
        address indexed blueChipNftAddr,
        address indexed creator,
        uint256 nftUnits
    );

    event X404DepositNFT(
        address indexed caller,
        address indexed from,
        uint256 indexed tokenId,
        uint256 redeemDeadline
    );

    event X404RedeemNFT(
        address indexed redeemer,
        address indexed depositor,
        uint256 indexed tokenId
    );
}
