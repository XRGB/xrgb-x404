// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {ERC404} from "./ERC404.sol";
import {IX404Hub} from "./interfaces/IX404Hub.sol";
import {IPeripheryImmutableState} from "./interfaces/IPeripheryImmutableState.sol";
import {IUniswapV3PoolState} from "./interfaces/IUniswapV3PoolState.sol";
import {IUniswapV2Router} from "./interfaces/IUniswapV2Router.sol";
import {DataTypes} from "./lib/DataTypes.sol";
import {Errors} from "./lib/Errors.sol";
import {Events} from "./lib/Events.sol";
import {LibCalculate} from "./lib/LibCalculate.sol";
import {X404Storage} from "./storage/X404Storage.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract X404 is IERC721Receiver, ERC404, Ownable, X404Storage {
    using EnumerableSet for EnumerableSet.UintSet;

    address public immutable creator;
    address public immutable blueChipNftAddr;
    address public immutable x404Hub;

    modifier onlyX404Hub() {
        if (msg.sender != x404Hub) {
            revert Errors.OnlyCallByFactory();
        }
        _;
    }

    modifier onlyEOA() {
        if (msg.sender != tx.origin) {
            revert Errors.OnlySupportEOA();
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        decimals = 18;
        uint256 nftUnits;
        (blueChipNftAddr, creator, maxRedeemDeadline, nftUnits) = IX404Hub(
            msg.sender
        )._parameters();

        units = nftUnits * 10 ** 18;
        address newOwner = IX404Hub(msg.sender).owner();
        string memory oriName = IERC721Metadata(blueChipNftAddr).name();
        string memory oriSymbol = IERC721Metadata(blueChipNftAddr).symbol();
        name = string.concat("X404-", oriName);
        symbol = string.concat("X404-", oriSymbol);
        DataTypes.SwapRouter[] memory swapRouterStruct = IX404Hub(msg.sender)
            .getSwapRouter();
        _setRouterTransferExempt(swapRouterStruct);
        _setERC721TransferExempt(address(this), true);
        x404Hub = msg.sender;
        _transferOwnership(newOwner);
    }

    /// @notice redeem nfts from contract when user hold n * units erc20 token
    /// @param tokenIds The array tokenid of deposit nft.
    /// @param redeemDeadline The redeemDeadline. means before deadline, Only you can redeem your nft. after deadline, anyone who hold more than units erc20 token can redeem your nft.
    function depositNFT(
        uint256[] calldata tokenIds,
        uint256 redeemDeadline
    ) external {
        if (
            redeemDeadline < block.timestamp ||
            redeemDeadline > block.timestamp + maxRedeemDeadline
        ) {
            revert Errors.InvalidDeadLine();
        }
        uint256 len = tokenIds.length;
        if (len == 0) {
            revert Errors.InvalidLength();
        }
        for (uint256 i = 0; i < len; ) {
            IERC721Metadata(blueChipNftAddr).transferFrom(
                msg.sender,
                address(this),
                tokenIds[i]
            );
            if (tokenIdSet.add(tokenIds[i])) {
                NFTDepositInfo storage subInfo = nftDepositInfo[tokenIds[i]];
                subInfo.caller = msg.sender;
                subInfo.oriOwner = msg.sender;
                subInfo.redeemDeadline = redeemDeadline;
            } else {
                revert Errors.InvalidTokenId();
            }
            emit Events.X404DepositNFT(
                msg.sender,
                msg.sender,
                tokenIds[i],
                redeemDeadline
            );
            unchecked {
                i++;
            }
        }
        _transferERC20WithERC721(address(0), msg.sender, len * units);
    }

    /// @notice redeem nfts from contract when user hold n * units erc20 token
    /// @param tokenIds The array tokenid of redeem nft.
    function redeemNFT(uint256[] calldata tokenIds) external {
        uint256 len = tokenIds.length;
        if (len == 0) {
            revert Errors.InvalidLength();
        }

        _transferERC20WithERC721(msg.sender, address(0), units * len);

        for (uint256 i = 0; i < tokenIds.length; ) {
            address oriOwner = nftDepositInfo[tokenIds[i]].oriOwner;
            if (
                oriOwner != msg.sender &&
                nftDepositInfo[tokenIds[i]].redeemDeadline > block.timestamp
            ) {
                revert Errors.NFTCannotRedeem();
            }
            IERC721Metadata(blueChipNftAddr).safeTransferFrom(
                address(this),
                msg.sender,
                tokenIds[i]
            );
            emit Events.X404RedeemNFT(msg.sender, oriOwner, tokenIds[i]);
            delete nftDepositInfo[tokenIds[i]];
            if (!tokenIdSet.remove(tokenIds[i])) {
                revert Errors.RemoveFailed();
            }
            unchecked {
                i++;
            }
        }
    }

    /// @notice when user send nft to this contract by "safeTransferFrom"
    /// @param caller caller who call function "safeTransferFrom".
    /// @param from The Nft owner
    /// @param tokenId The nft tokenid
    /// @param data The redeem deadline
    function onERC721Received(
        address caller,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        if (msg.sender != blueChipNftAddr) {
            revert Errors.InvalidNFTAddress();
        }
        uint256 redeemDeadline = abi.decode(data, (uint256));
        if (
            redeemDeadline < block.timestamp ||
            redeemDeadline > block.timestamp + maxRedeemDeadline
        ) {
            revert Errors.InvalidDeadLine();
        }
        _transferERC20WithERC721(address(0), from, units);
        if (tokenIdSet.add(tokenId)) {
            NFTDepositInfo storage subInfo = nftDepositInfo[tokenId];
            subInfo.caller = caller;
            subInfo.oriOwner = from;
            subInfo.redeemDeadline = redeemDeadline;
        } else {
            revert Errors.InvalidTokenId();
        }
        emit Events.X404DepositNFT(caller, from, tokenId, redeemDeadline);

        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Force buy token from someone when the nft hold by this contract is less than minimumNftAmount, to avoid can not redeem nft anymore
    /// @param forcedSeller the account force buy token from.
    /// @param amount The amount of force buy
    function forceBuy(
        address forcedSeller,
        uint256 amount
    ) external payable onlyEOA {
        if (forcedSeller.code.length > 0) {
            revert Errors.CannotForceBuyFromContract();
        }

        (uint256 minimumNftAmount, uint256 ratio) = IX404Hub(x404Hub)
            .getForceBuyParam();
        uint256 nftAmount = IERC721Metadata(blueChipNftAddr).balanceOf(
            address(this)
        );
        if (nftAmount > minimumNftAmount) {
            revert Errors.CannotForceBuy();
        }
        uint256 balance = balanceOf[forcedSeller];
        if (amount > balance) {
            revert Errors.NotEnoughToBuy();
        }

        DataTypes.SwapRouter[] memory swapRouterStruct = IX404Hub(msg.sender)
            .getSwapRouter();
        uint256 ethAmount = LibCalculate._getHighestPriceFromSwap(
            amount,
            swapRouterStruct
        );
        uint256 finalPrice = (ethAmount * ratio) / 10000;
        if (msg.value < finalPrice) {
            revert Errors.MsgValueNotEnough();
        }

        _transferERC20WithERC721(forcedSeller, msg.sender, amount);

        (bool success, ) = forcedSeller.call{value: finalPrice}("");
        if (!success) {
            revert Errors.SendETHFailed();
        }
        if (msg.value > finalPrice) {
            (bool success1, ) = msg.sender.call{value: msg.value - finalPrice}(
                ""
            );
            if (!success1) {
                revert Errors.SendETHFailed();
            }
        }
    }

    function getTokenIdSet() external view returns (uint256[] memory) {
        return tokenIdSet.values();
    }

    function checkTokenIdExsit(uint256 tokenId) external view returns (bool) {
        return tokenIdSet.contains(tokenId);
    }

    /**************Only Call By Factory Function **********/

    function setContractURI(
        string calldata newContractUri
    ) external onlyX404Hub returns (bool) {
        contractURI = newContractUri;
        return true;
    }

    function setTokenURI(string calldata _tokenURI) external onlyX404Hub {
        baseTokenURI = _tokenURI;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return string.concat(baseTokenURI, Strings.toString(id));
    }

    /**************Internal Function **********/
    function _setRouterTransferExempt(
        DataTypes.SwapRouter[] memory swapRouterStruct
    ) private {
        address thisAddress = address(this);
        for (uint i = 0; i < swapRouterStruct.length; ) {
            address routerAddr = swapRouterStruct[i].routerAddr;
            if (routerAddr == address(0)) {
                revert Errors.CantBeZeroAddress();
            }
            _setERC721TransferExempt(routerAddr, true);

            if (swapRouterStruct[i].bV2orV3) {
                address weth_ = IUniswapV2Router(routerAddr).WETH();
                address swapFactory = IUniswapV2Router(routerAddr).factory();
                address pair = LibCalculate._getUniswapV2Pair(
                    swapFactory,
                    thisAddress,
                    weth_
                );
                _setERC721TransferExempt(pair, true);
            } else {
                address weth_ = IPeripheryImmutableState(routerAddr).WETH9();
                address swapFactory = IPeripheryImmutableState(routerAddr)
                    .factory();
                address v3NonfungiblePositionManager = swapRouterStruct[i]
                    .uniswapV3NonfungiblePositionManager;
                if (v3NonfungiblePositionManager == address(0)) {
                    revert Errors.CantBeZeroAddress();
                }
                if (
                    IPeripheryImmutableState(v3NonfungiblePositionManager)
                        .factory() !=
                    swapFactory ||
                    IPeripheryImmutableState(v3NonfungiblePositionManager)
                        .WETH9() !=
                    weth_
                ) {
                    revert Errors.X404SwapV3FactoryMismatch();
                }
                _setERC721TransferExempt(v3NonfungiblePositionManager, true);
                _setV3SwapTransferExempt(swapFactory, thisAddress, weth_);
            }
            unchecked {
                ++i;
            }
        }
    }

    function _setV3SwapTransferExempt(
        address swapFactory,
        address tokenA,
        address tokenB
    ) private {
        uint24[4] memory feeTiers = [
            uint24(100),
            uint24(500),
            uint24(3_000),
            uint24(10_000)
        ];

        for (uint256 i = 0; i < feeTiers.length; ) {
            address v3PairAddr = LibCalculate._getUniswapV3Pair(
                swapFactory,
                tokenA,
                tokenB,
                feeTiers[i]
            );
            // Set the v3 pair as exempt.
            _setERC721TransferExempt(v3PairAddr, true);
            unchecked {
                ++i;
            }
        }
    }
}
