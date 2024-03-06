// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BlueChipNFT is ERC721 {
    uint256 public tokenId;

    constructor() ERC721("BlueChip", "BCN") {}

    function mint() public {
        _safeMint(msg.sender, tokenId++);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/";
    }
}
