// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {DataTypes} from "../lib/DataTypes.sol";

abstract contract X404HubStorage {
    DataTypes.CreateX404Parameters public _parameters;
    bool internal _bNoPermission;
    bool internal _bEmergencyClose;
    uint256 internal _redeemMaxDeadline;
    uint256 internal _mininumNftCanForceBuy;
    uint256 internal _forceBuyratio;
    DataTypes.SwapRouter[] public _swapRouterAddr;
    mapping(address => bool) internal _blueChipNftContract;
    mapping(address => address) internal _x404Contract;
}
