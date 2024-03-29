// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC404} from "./ERC404.sol";
import {IX404Hub} from "./interfaces/IX404Hub.sol";
import {IPeripheryImmutableState} from "./interfaces/IPeripheryImmutableState.sol";
import {IUniswapV2Router} from "./interfaces/IUniswapV2Router.sol";
import {DataTypes} from "./lib/DataTypes.sol";
import {Errors} from "./lib/Errors.sol";
import {Events} from "./lib/Events.sol";
import {LibCalculatePair} from "./lib/LibCalculatePair.sol";
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

    constructor() Ownable(msg.sender) {
        decimals = 18;
        (blueChipNftAddr, creator, maxRedeemDeadline) = IX404Hub(msg.sender)
            ._parameters();

        units = 10 ** 18;
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
        uint256[] memory tokenIds,
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
                revert InvalidTokenId();
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
        _transferERC20WithERC721(address(0x0), msg.sender, len * units);
    }

    /// @notice redeem nfts from contract when user hold n * units erc20 token
    /// @param tokenIds The array tokenid of redeem nft.
    function redeemNFT(uint256[] memory tokenIds) external payable {
        uint256 len = tokenIds.length;
        if (len == 0) {
            revert Errors.InvalidLength();
        }
        if (redeemFee > 0) {
            //revert if msg.value < redeemFee
            uint256 totalRedeemFee = len * redeemFee;
            if (msg.value < totalRedeemFee) {
                revert Errors.MsgValueNotEnough();
            }
            //send redeemFee
            (bool sucess, ) = payable(owner()).call{value: totalRedeemFee}("");
            if (!sucess) {
                revert Errors.SendETHFailed();
            }
            //refund if msg.value > redeemFee
            if (msg.value > totalRedeemFee) {
                (bool sucess1, ) = payable(msg.sender).call{
                    value: msg.value - totalRedeemFee
                }("");
                if (!sucess1) {
                    revert Errors.SendETHFailed();
                }
            }
        } else {
            //refund if not charge redeemFee
            if (msg.value > 0) {
                (bool sucess2, ) = payable(msg.sender).call{value: msg.value}(
                    ""
                );
                if (!sucess2) {
                    revert Errors.SendETHFailed();
                }
            }
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
            if (!tokenIdSet.remove(tokenIds[i])) {
                revert Errors.RemoveFailed();
            }
            IERC721Metadata(blueChipNftAddr).safeTransferFrom(
                address(this),
                msg.sender,
                tokenIds[i]
            );
            emit Events.X404RedeemNFT(msg.sender, oriOwner, tokenIds[i]);
            delete nftDepositInfo[tokenIds[i]];
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
        _transferERC20WithERC721(address(0), caller, units);
        if (tokenIdSet.add(tokenId)) {
            NFTDepositInfo storage subInfo = nftDepositInfo[tokenId];
            subInfo.caller = caller;
            subInfo.oriOwner = from;
            subInfo.redeemDeadline = redeemDeadline;
        } else {
            revert InvalidTokenId();
        }
        emit Events.X404DepositNFT(caller, from, tokenId, redeemDeadline);

        return IERC721Receiver.onERC721Received.selector;
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
        if (bytes(newContractUri).length == 0) {
            revert Errors.InvalidLength();
        }
        contractURI = newContractUri;
        emit Events.SetContractURI(contractURI);
        return true;
    }

    function setRedeemFee(
        uint256 newRedeemFee
    ) external onlyX404Hub returns (bool) {
        if (newRedeemFee > 0.2 ether) {
            revert Errors.RedeemFeeTooHigh();
        }
        redeemFee = newRedeemFee;
        emit Events.SetRedeemFee(redeemFee);
        return true;
    }

    function setTokenURI(string calldata _tokenURI) external onlyX404Hub {
        if (bytes(_tokenURI).length == 0) {
            revert Errors.InvalidLength();
        }
        baseURI = _tokenURI;
        emit Events.SetTokenURI(baseURI);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        address erc721Owner = _getOwnerOf(id);
        if (erc721Owner == address(0x0)) {
            revert NotFound();
        }
        return string.concat(baseURI, Strings.toString(id));
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
                address pair = LibCalculatePair._getUniswapV2Pair(
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
            address v3PairAddr = LibCalculatePair._getUniswapV3Pair(
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
