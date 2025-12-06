import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { solanaService } from '../services/solanaService';

export interface GameSessionState {
  isActive: boolean;
  sessionPDA: PublicKey | null;
  wagerAmount: number;
  startTime: number | null;
  isProcessing: boolean;
  error: string | null;
}

export const useGameSession = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [sessionState, setSessionState] = useState<GameSessionState>({
    isActive: false,
    sessionPDA: null,
    wagerAmount: 0,
    startTime: null,
    isProcessing: false,
    error: null,
  });

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return;

    try {
      const bal = await solanaService.getBalance(wallet.publicKey);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [wallet.publicKey]);

  // Initialize player account (first time setup)
  const initializePlayer = useCallback(async () => {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setSessionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const signature = await solanaService.initializePlayer(wallet);
      console.log('Player initialized:', signature);
      return signature;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to initialize player';
      setSessionState(prev => ({ ...prev, error: errorMsg }));
      throw error;
    } finally {
      setSessionState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [wallet]);

  // Start game session with wager
  const startGameSession = useCallback(async (wagerAmount: number) => {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setSessionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Ensure player account exists
      const stats = await solanaService.getPlayerStats(wallet.publicKey);
      if (!stats) {
        await initializePlayer();
      }

      // Place wager
      const { signature, sessionPDA } = await solanaService.placeWager(
        wallet,
        wagerAmount
      );

      console.log('Wager placed:', signature);

      setSessionState({
        isActive: true,
        sessionPDA,
        wagerAmount,
        startTime: Date.now(),
        isProcessing: false,
        error: null,
      });

      await fetchBalance();

      return { signature, sessionPDA };
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to start game session';
      setSessionState(prev => ({
        ...prev,
        error: errorMsg,
        isProcessing: false
      }));
      throw error;
    }
  }, [wallet, initializePlayer, fetchBalance]);

  // End game session and record result
  const endGameSession = useCallback(async (
    finalMass: number,
    survived: boolean
  ) => {
    if (!wallet.publicKey || !sessionState.sessionPDA) {
      throw new Error('No active game session');
    }

    setSessionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const { signature, payout } = await solanaService.recordResult(
        wallet,
        sessionState.sessionPDA,
        finalMass,
        survived
      );

      console.log('Game result recorded:', signature);
      console.log('Payout:', payout);

      setSessionState({
        isActive: false,
        sessionPDA: null,
        wagerAmount: 0,
        startTime: null,
        isProcessing: false,
        error: null,
      });

      await fetchBalance();

      return { signature, payout };
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to record game result';
      setSessionState(prev => ({
        ...prev,
        error: errorMsg,
        isProcessing: false
      }));
      throw error;
    }
  }, [wallet, sessionState.sessionPDA, fetchBalance]);

  // Get player statistics
  const getPlayerStats = useCallback(async () => {
    if (!wallet.publicKey) return null;

    try {
      return await solanaService.getPlayerStats(wallet.publicKey);
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return null;
    }
  }, [wallet.publicKey]);

  return {
    balance,
    sessionState,
    fetchBalance,
    initializePlayer,
    startGameSession,
    endGameSession,
    getPlayerStats,
  };
};
