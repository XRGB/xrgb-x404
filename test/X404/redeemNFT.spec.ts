
import {
    makeSuiteCleanRoom,deployer, x404Hub, owner, deployerAddress, user, yestoday, tomorrow, tomorrow2, userAddress, abiCoder, userTwo, userTwoAddress
} from '../__setup.spec';
import { parseEther } from 'ethers';
import { expect } from 'chai';
import { ERRORS } from '../helpers/errors';
import { findEvent, waitForTx, getTimestamp, setNextBlockTimestamp } from '../helpers/utils';

import {
    BlueChipNFT,
    BlueChipNFT__factory, X404, X404__factory
} from '../../typechain-types';

makeSuiteCleanRoom('redeemNFT', function () {
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

            const receipt = await waitForTx(x404Hub.connect(deployer).createX404(blueChipAddr, 10000))
            const event = findEvent(receipt, 'X404Created');
            x404Addr = event!.args[0];
            expect(await x404Hub.connect(deployer)._x404Contract(blueChipAddr)).to.equal(x404Addr)
            expect(await x404Hub.connect(owner).setContractURI(blueChipAddr, ContractURI)).to.be.not.reverted

            x404 = X404__factory.connect(x404Addr)
            expect(await x404.connect(owner).contractURI()).to.equal(ContractURI)
            expect(await x404Hub.connect(owner).setTokenURI(blueChipAddr, TokenURI)).to.be.not.reverted

            blueChipNft = BlueChipNFT__factory.connect(blueChipAddr)
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(user).mint()).to.be.not.reverted
            expect(await blueChipNft.connect(userTwo).mint()).to.be.not.reverted
            normalNft = BlueChipNFT__factory.connect(nft0Addr)
            expect(await normalNft.connect(user).mint()).to.be.not.reverted

            const abicode = abiCoder.encode(['uint256'], [tomorrow]);
            await expect(blueChipNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 0, abicode)).to.be.not.reverted
            expect(await blueChipNft.connect(user).ownerOf(0)).to.equal(await x404.getAddress())
            expect(await x404.connect(user).balanceOf(userAddress)).to.equal(parseEther("10000"))
            expect(await x404.connect(user).erc721BalanceOf(userAddress)).to.equal(1)

            await blueChipNft.connect(user).setApprovalForAll(x404.getAddress(), true);
            await expect(x404.connect(user).depositNFT([1], tomorrow)).to.be.not.reverted
            expect(await blueChipNft.connect(user).ownerOf(1)).to.equal(await x404.getAddress())
            expect(await x404.connect(user).balanceOf(userAddress)).to.equal(parseEther("20000"))
            expect(await x404.connect(user).erc721BalanceOf(userAddress)).to.equal(2)

            const subInfo = await x404.connect(user).nftDepositInfo(0)
            expect(subInfo[0]).to.equal(userAddress)
            expect(subInfo[1]).to.equal(userAddress)
            expect(subInfo[2]).to.equal(tomorrow)
            expect(await x404.connect(user).checkTokenIdExsit(0)).to.equal(true)
        });
        
        context('Negatives', function () {
            it('User should fail to deposit if noe own this nft.',   async function () {
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(blueChipNft.connect(user)['safeTransferFrom(address,address,uint256,bytes)'](userAddress, x404Addr, 0, abicode)).to.be.reverted
            });
            it('User should fail to redeem if tokenid length = 0.',   async function () {
                await expect(x404.connect(user).redeemNFT([])).to.be.revertedWithCustomError(x404, ERRORS.InvalidLength)
            });
            it('User should fail to redeem if erc20 token not enough.',   async function () {
                await expect(x404.connect(userTwo).redeemNFT([0])).to.be.reverted
            });
            it('User should fail to redeem if erc20 token not enough.',   async function () {
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(blueChipNft.connect(userTwo)['safeTransferFrom(address,address,uint256,bytes)'](userTwoAddress, x404Addr, 3, abicode)).to.be.not.reverted
                expect(await x404.connect(user).balanceOf(userTwoAddress)).to.equal(parseEther("10000"))
                expect(await x404.connect(user).erc721BalanceOf(userTwoAddress)).to.equal(1)

                await expect(x404.connect(userTwo).redeemNFT([0])).to.be.revertedWithCustomError(x404, ERRORS.NFTCannotRedeem)
            });
        })

        context('Scenarios', function () {
            it('Redeem success if you are the owner.',   async function () {
                await expect(x404.connect(user).redeemNFT([0])).to.be.not.reverted
                expect(await x404.connect(user).balanceOf(userAddress)).to.equal(parseEther("10000"))
                expect(await x404.connect(user).erc721BalanceOf(userAddress)).to.equal(1)
                expect(await blueChipNft.connect(user).ownerOf(0)).to.equal(userAddress)
            });
            it('Redeem success if you are the owner.',   async function () {
                const abicode = abiCoder.encode(['uint256'], [tomorrow]);
                await expect(blueChipNft.connect(userTwo)['safeTransferFrom(address,address,uint256,bytes)'](userTwoAddress, x404Addr, 3, abicode)).to.be.not.reverted
                expect(await x404.connect(user).balanceOf(userTwoAddress)).to.equal(parseEther("10000"))
                expect(await x404.connect(user).erc721BalanceOf(userTwoAddress)).to.equal(1)

                const currentTimestamp = await getTimestamp();
                await setNextBlockTimestamp(Number(currentTimestamp) + 48 * 60 * 60);

                await expect(x404.connect(userTwo).redeemNFT([0])).to.be.not.reverted
                expect(await x404.connect(user).balanceOf(userTwoAddress)).to.equal(0)
                expect(await x404.connect(user).erc721BalanceOf(userTwoAddress)).to.equal(0)
                expect(await blueChipNft.connect(user).ownerOf(0)).to.equal(userTwoAddress)
            });
        })
    })
})