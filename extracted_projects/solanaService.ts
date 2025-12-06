import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID - Replace with actual deployed program ID
const PROGRAM_ID = new PublicKey('TrashWarsProgram11111111111111111111111111');

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint, 'confirmed');
    this.programId = PROGRAM_ID;
  }

  // Get SOL balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  // Get player PDA (Program Derived Address)
  async getPlayerPDA(authority: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from('player'), authority.toBuffer()],
      this.programId
    );
  }

  // Get game session PDA
  async getGameSessionPDA(
    authority: PublicKey,
    timestamp: number
  ): Promise<[PublicKey, number]> {
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(timestamp));
    
    return await PublicKey.findProgramAddress(
      [Buffer.from('session'), authority.toBuffer(), timestampBuffer],
      this.programId
    );
  }

  // Get vault PDA
  async getVaultPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from('vault')],
      this.programId
    );
  }

  // Initialize player account
  async initializePlayer(wallet: WalletContextState): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [playerPDA] = await this.getPlayerPDA(wallet.publicKey);

    // Check if player account already exists
    const accountInfo = await this.connection.getAccountInfo(playerPDA);
    if (accountInfo) {
      return 'Player account already exists';
    }

    // Create initialize player instruction
    const instruction = await this.createInitializePlayerInstruction(
      wallet.publicKey,
      playerPDA
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  // Place wager and start game session
  async placeWager(
    wallet: WalletContextState,
    wagerAmount: number
  ): Promise<{ signature: string; sessionPDA: PublicKey }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const wagerLamports = Math.floor(wagerAmount * LAMPORTS_PER_SOL);
    
    // Validate wager amount
    if (wagerLamports < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error('Wager too low (min 0.01 SOL)');
    }
    if (wagerLamports > 0.5 * LAMPORTS_PER_SOL) {
      throw new Error('Wager too high (max 0.5 SOL)');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const [playerPDA] = await this.getPlayerPDA(wallet.publicKey);
    const [sessionPDA] = await this.getGameSessionPDA(wallet.publicKey, timestamp);
    const [vaultPDA] = await this.getVaultPDA();

    const instruction = await this.createPlaceWagerInstruction(
      wallet.publicKey,
      playerPDA,
      sessionPDA,
      vaultPDA,
      wagerLamports
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature);

    return { signature, sessionPDA };
  }

  // Record game result and process payout
  async recordResult(
    wallet: WalletContextState,
    sessionPDA: PublicKey,
    finalMass: number,
    survived: boolean
  ): Promise<{ signature: string; payout: number }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [playerPDA] = await this.getPlayerPDA(wallet.publicKey);
    const [vaultPDA] = await this.getVaultPDA();

    const instruction = await this.createRecordResultInstruction(
      wallet.publicKey,
      playerPDA,
      sessionPDA,
      vaultPDA,
      finalMass,
      survived
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature);

    // Calculate payout
    const sessionAccount = await this.connection.getAccountInfo(sessionPDA);
    let payout = 0;
    if (sessionAccount && survived) {
      // Parse payout from account data (simplified)
      payout = finalMass / 500; // Basic calculation
    }

    return { signature, payout };
  }

  // Helper methods to create instructions (simplified - in production use Anchor IDL)
  private async createInitializePlayerInstruction(
    authority: PublicKey,
    playerPDA: PublicKey
  ) {
    // This is a placeholder - in production, use Anchor's IDL to generate instructions
    return SystemProgram.createAccount({
      fromPubkey: authority,
      newAccountPubkey: playerPDA,
      lamports: await this.connection.getMinimumBalanceForRentExemption(8 + 56),
      space: 8 + 56,
      programId: this.programId,
    });
  }

  private async createPlaceWagerInstruction(
    authority: PublicKey,
    playerPDA: PublicKey,
    sessionPDA: PublicKey,
    vaultPDA: PublicKey,
    wagerLamports: number
  ) {
    // Placeholder - use Anchor IDL in production
    return SystemProgram.transfer({
      fromPubkey: authority,
      toPubkey: vaultPDA,
      lamports: wagerLamports,
    });
  }

  private async createRecordResultInstruction(
    authority: PublicKey,
    playerPDA: PublicKey,
    sessionPDA: PublicKey,
    vaultPDA: PublicKey,
    finalMass: number,
    survived: boolean
  ) {
    // Placeholder - use Anchor IDL in production
    return SystemProgram.transfer({
      fromPubkey: vaultPDA,
      toPubkey: authority,
      lamports: 0, // Calculated by smart contract
    });
  }

  // Get player stats
  async getPlayerStats(publicKey: PublicKey): Promise<{
    totalGames: number;
    totalWins: number;
    totalEarnings: number;
  } | null> {
    const [playerPDA] = await this.getPlayerPDA(publicKey);
    const accountInfo = await this.connection.getAccountInfo(playerPDA);
    
    if (!accountInfo) {
      return null;
    }

    // Parse account data (simplified - use Anchor in production)
    // This would parse the actual account structure
    return {
      totalGames: 0,
      totalWins: 0,
      totalEarnings: 0,
    };
  }
}

// Export singleton instance
export const solanaService = new SolanaService(
  'https://api.devnet.solana.com'
);
