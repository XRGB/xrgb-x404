// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

library Errors {
    error InvalidLength();
    error OnlyCallByFactory();
    error NotBlueChipNFT();
    error X404NotCreate();
    error CantBeZeroAddress();
    error X404SwapV3FactoryMismatch();
    error InvalidNFTAddress();
    error InvalidDeadLine();
    error NFTCannotRedeem();
    error RemoveFailed();
    error EmergencyClose();
    error InvaildRedeemMaxDeadline();
    error MsgValueNotEnough();
    error SendETHFailed();
    error RedeemFeeTooHigh();
}
