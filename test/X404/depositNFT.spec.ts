
import {
    makeSuiteCleanRoom,deployer, x404Hub, owner, deployerAddress, user, yestoday, tomorrow, tomorrow2, userAddress, abiCoder, userTwoAddress, ownerAddress
} from '../__setup.spec';
import { expect } from 'chai';
import { ERRORS } from '../helpers/errors';
import { findEvent, waitForTx } from '../helpers/utils';
import { parseEther } from 'ethers';

import {
    BlueChipNFT,
    BlueChipNFT__factory, X404, X404__factory
} from '../../typechain-types';

makeSuiteCleanRoom('depositNFT', function () {
    const ContractURI = "https://xrgb.xyz/contract"
    const TokenURI = "https://xrgb.xyz/metadata/"

    context('Generic', function () {
        let nft0Addr: string;
        let blueChipAddr: string;
        let x404: X404;
        let blueChipNft: BlueChipNFT;
        let normalNft: BlueChipNFT;
        let x404Addr: string;
        beforeEach(async function () {
            const nft0 = await new BlueChipNFT__factory(deployer).deploy();
            nft0Addr = await nft0.getAddress();
            const nft1 = await new BlueChipNFT__factory(deployer).deploy();
            blueChipAddr = await nft1.getAddress();

            await expect(x404Hub.connect(owner).setBlueChipNftContract([blueChipAddr], true)).to.be.not.reverted
            expect(await x404Hub.connect(owner)._blueChipNftContract(blueChipAddr)).to.equal(true)

            const receipt = await waitForTx(x404Hub.connect(deployer).createX404(blueChipAddr))
            const event = findEvent(receipt, 'X404Created');
            x404Addr = event!.args[0];
            expect(await x404Hub.connect(deployer)._x404Contract(blueChipAddr)).to.equal(x404Addr)
            expect(await x404Hub.connect(owner).setContractURI(blueChipAddr, ContractURI)).to.be.not.reverted

            x404 = X404__factory.connect(x404Addr)
            expect(await x404.connect(owner).contractURI()).to.equal(ContractURI)

            expect(await x404Hub.connect(owner).setTokenURI(blueChipAddr, TokenURI)).to.be.not.reverted
            expect(await x404.connect(owner).baseURI()).to.equal(TokenURI)

            blueChipNft = BlueChipNFT__factory.connect(blueChipAddr)
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            normalNft = BlueChipNFT__factory.connect(nft0Addr)
            expect(await normalNft.connect(user).mint()).to.be.not.reverted
        });
        
        context('Negatives', function () {
            it('User should fail to deposit if deadline less than now.',   async function () {
                await expect(x404.connect(user).depositNFT([0], yestoday)).to.be.revertedWithCustomError(x404, ERRORS.InvalidDeadLine)
            });
            it('User should fail to deposit if deadline large than max deadlin.',   async function () {
                await expect(x404.connect(user).depositNFT([0], tomorrow2)).to.be.revertedWithCustomError(x404, ERRORS.InvalidDeadLine)
            });
            it('User should fail to deposit if not approve nft to contract.',   async function () {
                await expect(x404.connect(user).depositNFT([0], tomorrow)).to.be.reverted
            });
            it('User should fail to deposit if not correct nft contract use safeTransferFrom.',   async function () {
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(normalNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 0, abicode)).to.be.revertedWithCustomError(x404, ERRORS.InvalidNFTAddress)
            });
            it('User should fail to deposit if use error param when safeTransferFrom.',   async function () {
                const abicode = abiCoder.encode(['address'], [userAddress]);
                await expect(blueChipNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 0, abicode)).to.be.revertedWithCustomError(x404, ERRORS.InvalidDeadLine)
            });
        })

        context('Scenarios', function () {
            it('Get correct available if deposit nft success.',   async function () {
                await blueChipNft.connect(user).setApprovalForAll(x404.getAddress(), true);
                await expect(x404.connect(user).depositNFT([0], tomorrow)).to.be.not.reverted
                expect(await blueChipNft.connect(user).ownerOf(0)).to.equal(await x404.getAddress())
                
                const subInfo = await x404.connect(user).nftDepositInfo(0)
                expect(subInfo[0]).to.equal(userAddress)
                expect(subInfo[1]).to.equal(userAddress)
                expect(subInfo[2]).to.equal(tomorrow)
                expect(await x404.connect(user).checkTokenIdExsit(0)).to.equal(true)
                expect(await x404.connect(user).minted()).to.equal(1)

                await expect(x404.connect(user).depositNFT([2], tomorrow)).to.be.not.reverted
                expect(await x404.connect(user).checkTokenIdExsit(2)).to.equal(true)
                expect(await x404.connect(user).minted()).to.equal(2)
            });
            it('Get correct available if user use safeTransferFrom.',   async function () {
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(blueChipNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 0, abicode)).to.be.not.reverted
                expect(await blueChipNft.connect(user).ownerOf(0)).to.equal(await x404.getAddress())
                
                const subInfo = await x404.connect(user).nftDepositInfo(0)
                expect(subInfo[0]).to.equal(userAddress)
                expect(subInfo[1]).to.equal(userAddress)
                expect(subInfo[2]).to.equal(tomorrow)
                expect(await x404.connect(user).checkTokenIdExsit(0)).to.equal(true)
            });
            it('Get correct available if user transfer many times.',   async function () {
                const x404Addr = await x404.getAddress()
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(blueChipNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 1, abicode)).to.be.not.reverted
                expect(await blueChipNft.connect(user).ownerOf(1)).to.equal(x404Addr)
                
                const subInfo = await x404.connect(user).nftDepositInfo(1)
                expect(subInfo[0]).to.equal(userAddress)
                expect(subInfo[1]).to.equal(userAddress)
                expect(subInfo[2]).to.equal(tomorrow)
                expect(await x404.connect(user).checkTokenIdExsit(1)).to.equal(true)
                expect(await x404.connect(user).minted()).to.equal(1)

                await expect(blueChipNft.connect(user).setApprovalForAll(x404.getAddress(), true)).to.be.not.reverted;
                await expect(x404.connect(user).depositNFT([0,2,3], tomorrow)).to.be.not.reverted
                expect(await blueChipNft.connect(user).balanceOf(x404Addr)).to.equal(4)
                expect(await x404.connect(user).erc721TotalSupply()).to.equal(4)

                await expect(x404.connect(user).transfer(userTwoAddress, parseEther("0.5"))).to.be.not.reverted
                await expect(x404.connect(user).transfer(ownerAddress, parseEther("0.6"))).to.be.not.reverted
                expect(await x404.connect(user).erc721TotalSupply()).to.equal(2)
                expect(await x404.connect(user).erc721BalanceOf(userAddress)).to.equal(2)
                const arr = await x404.connect(user).getERC721TokensInQueue(0,2)
                expect(arr[0]).to.equal(3)
                expect(arr[1]).to.equal(4)
                await expect(x404.connect(user).transfer(userTwoAddress, parseEther("0.5"))).to.be.not.reverted
                expect(await x404.connect(user).erc721TotalSupply()).to.equal(3)
                expect(await x404.connect(user).erc721BalanceOf(userAddress)).to.equal(2)
                expect(await x404.connect(user).erc721BalanceOf(userTwoAddress)).to.equal(1)
                expect(await x404.connect(user).ownerOf(4)).to.equal(userTwoAddress)
            });
        })
    })
})