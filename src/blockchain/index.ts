import { ethers } from 'ethers';

// Dodaj tip za window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

class BlockchainManager {
    private provider: ethers.BrowserProvider;
    private signer: ethers.Signer | null = null;

    constructor() {
        this.provider = new ethers.BrowserProvider(window.ethereum);
    }

    async connectWallet(): Promise<void> {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.signer = await this.provider.getSigner();
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        }
    }

    async getAccount(): Promise<string | null> {
        if (this.signer) {
            return await this.signer.getAddress();
        }
        return null;
    }

    async mintNFT(tokenURI: string): Promise<void> {
        if (!this.signer) {
            console.error('Wallet not connected');
            return;
        }
        // Logic to mint NFT using smart contract
    }

    async getCryptoEarnings(highScore: number): Promise<number> {
        // Logic to calculate crypto earnings based on high score
        return highScore * 0.01; // Example calculation
    }
}

export default BlockchainManager;