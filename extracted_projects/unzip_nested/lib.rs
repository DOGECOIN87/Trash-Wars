use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("TrashWarsProgram11111111111111111111111111");

#[program]
pub mod trash_wars {
    use super::*;

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player_account;
        player.authority = ctx.accounts.authority.key();
        player.total_games = 0;
        player.total_wins = 0;
        player.total_earnings = 0;
        Ok(())
    }

    pub fn place_wager(
        ctx: Context<PlaceWager>,
        wager_amount: u64,
    ) -> Result<()> {
        // Validate wager amount (0.01 - 0.5 SOL)
        require!(wager_amount >= 10_000_000, ErrorCode::WagerTooLow); // Min 0.01 SOL
        require!(wager_amount <= 500_000_000, ErrorCode::WagerTooHigh); // Max 0.5 SOL

        let game_session = &mut ctx.accounts.game_session;
        let player = &mut ctx.accounts.player_account;

        // Transfer SOL to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, wager_amount)?;

        // Initialize game session
        game_session.player = ctx.accounts.authority.key();
        game_session.wager = wager_amount;
        game_session.start_time = Clock::get()?.unix_timestamp;
        game_session.is_active = true;
        game_session.final_mass = 0;
        game_session.payout = 0;
        game_session.end_time = 0;

        player.total_games += 1;

        Ok(())
    }

    pub fn record_result(
        ctx: Context<RecordResult>,
        final_mass: u64,
        survived: bool,
    ) -> Result<()> {
        let game_session = &mut ctx.accounts.game_session;
        require!(game_session.is_active, ErrorCode::GameNotActive);

        game_session.final_mass = final_mass;
        game_session.is_active = false;
        game_session.end_time = Clock::get()?.unix_timestamp;

        if survived {
            // Calculate payout: wager * (mass / 500)
            let multiplier = final_mass.checked_div(500).unwrap_or(0);
            let payout = game_session
                .wager
                .checked_mul(multiplier)
                .unwrap_or(game_session.wager);

            // Cap maximum payout at 10x wager
            let max_payout = game_session.wager.checked_mul(10).unwrap();
            let final_payout = payout.min(max_payout);

            // Transfer payout from vault to player
            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= final_payout;
            **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += final_payout;

            let player = &mut ctx.accounts.player_account;
            player.total_wins += 1;
            player.total_earnings = player.total_earnings.checked_add(final_payout).unwrap();

            game_session.payout = final_payout;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlayerAccount::SIZE,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player_account: Account<'info, PlayerAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceWager<'info> {
    #[account(
        mut,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player_account: Account<'info, PlayerAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + GameSession::SIZE,
        seeds = [b"session", authority.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub game_session: Account<'info, GameSession>,

    #[account(mut)]
    /// CHECK: Vault PDA
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordResult<'info> {
    #[account(
        mut,
        seeds = [b"session", authority.key().as_ref(), &game_session.start_time.to_le_bytes()],
        bump
    )]
    pub game_session: Account<'info, GameSession>,

    #[account(
        mut,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player_account: Account<'info, PlayerAccount>,

    #[account(mut)]
    /// CHECK: Vault PDA
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct PlayerAccount {
    pub authority: Pubkey,
    pub total_games: u64,
    pub total_wins: u64,
    pub total_earnings: u64,
}

impl PlayerAccount {
    pub const SIZE: usize = 32 + 8 + 8 + 8;
}

#[account]
pub struct GameSession {
    pub player: Pubkey,
    pub wager: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub final_mass: u64,
    pub payout: u64,
    pub is_active: bool,
}

impl GameSession {
    pub const SIZE: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Wager amount is too low (min 0.01 SOL)")]
    WagerTooLow,
    #[msg("Wager amount is too high (max 0.5 SOL)")]
    WagerTooHigh,
    #[msg("Game session is not active")]
    GameNotActive,
}
