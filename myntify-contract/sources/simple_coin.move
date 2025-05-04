module myntify::simple_coin {
    use std::string;
    use std::ascii;
    use iota::coin_manager::{Self, CoinManager, CoinManagerTreasuryCap, CoinManagerMetadataCap};
    use iota::coin::{Self, Coin};
    use iota::url;

    /// Type representing the SIMPLE_COIN token
    public struct SIMPLE_COIN has drop {}

    /// Initialize the SIMPLE_COIN token
    fun init(witness: SIMPLE_COIN, ctx: &mut TxContext) {
        // Create a `Coin` type and have it managed.
        let icon_url = url::new_unsafe_from_bytes(b"https://res.cloudinary.com/dltocubu4/image/upload/v1745606118/fdyvnnmtk78cumhcppgf.png");
        let (cm_treasury_cap, cm_meta_cap, mut manager) = coin_manager::create(
            witness,
            0, 
            b"SMC",
            b"Simple Coin",
            b"There are only 100, never any more.",
            option::some(icon_url),
            ctx
        );

        let initial_amount = 100; // Define initial amount
        let coin = coin_manager::mint(&cm_treasury_cap, &mut manager, initial_amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
        // Transfer the `CoinManagerTreasuryCap` to the creator of the `Coin`.
        transfer::public_transfer(cm_treasury_cap, tx_context::sender(ctx));
        
        // Transfer the `CoinManagerMetadataCap` to the creator of the `Coin`.
        transfer::public_transfer(cm_meta_cap, tx_context::sender(ctx));

        // Publicly share the `CoinManager` object for convenient usage by anyone interested.
        transfer::public_share_object(manager);
    }

    /// Mint new SIMPLE_COIN tokens
    public entry fun mint(
        treasury_cap: &mut CoinManagerTreasuryCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin_manager::mint(treasury_cap, manager, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Set maximum supply for the token (can only be done once)
    public entry fun set_max_supply(
        treasury_cap: &mut CoinManagerTreasuryCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        max_supply: u64
    ) {
        coin_manager::enforce_maximum_supply(treasury_cap, manager, max_supply)
    }

    /// Transfer tokens to another address
    public entry fun transfer(
        coin: &mut Coin<SIMPLE_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin_to_transfer = coin::split(coin, amount, ctx);
        transfer::public_transfer(coin_to_transfer, recipient);
    }

     /// Batch transfer tokens to multiple addresses
    public entry fun batch_transfer(
        coin: &mut Coin<SIMPLE_COIN>,
        amounts: vector<u64>,
        recipients: vector<address>,
        ctx: &mut TxContext
    ) {
        let recipients_len = vector::length(&recipients);
        let amounts_len = vector::length(&amounts);
        
        // Ensure the vectors have the same length
        assert!(recipients_len == amounts_len, 1000);
        
        let mut i = 0;
        while (i < recipients_len) {
            let amount = *vector::borrow(&amounts, i);
            let recipient = *vector::borrow(&recipients, i);
            
            // Split and transfer the coin
            let coin_to_transfer = coin::split(coin, amount, ctx);
            transfer::public_transfer(coin_to_transfer, recipient);
            
            i = i + 1;
        }
    }

    /// Burn tokens
    public entry fun burn(
        treasury_cap: &mut CoinManagerTreasuryCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        coin: Coin<SIMPLE_COIN>
    ) {
        coin_manager::burn(treasury_cap, manager, coin);
    }

    /// Update token name
    public entry fun update_name(
        metadata_cap: &mut CoinManagerMetadataCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        new_name: string::String
    ) {
        coin_manager::update_name(metadata_cap, manager, new_name);
    }

    /// Update token symbol
    public entry fun update_symbol(
        metadata_cap: &mut CoinManagerMetadataCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        new_symbol: ascii::String
    ) {
        coin_manager::update_symbol(metadata_cap, manager, new_symbol);
    }

    public entry fun update_description(
        metadata_cap: &mut CoinManagerMetadataCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        new_description: string::String
    ) {
        coin_manager::update_description(metadata_cap, manager, new_description);
    }

    public entry fun update_icon_url(
        metadata_cap: &mut CoinManagerMetadataCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>,
        new_icon_url: ascii::String
    ) {
        coin_manager::update_icon_url(metadata_cap, manager, new_icon_url);
    }


    /// Renounce treasury ownership, making supply immutable
    public entry fun renounce_treasury_ownership(
        treasury_cap: CoinManagerTreasuryCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>
    ) {
        coin_manager::renounce_treasury_ownership(treasury_cap, manager);
    }

    /// Renounce metadata ownership, making metadata immutable
    public entry fun renounce_metadata_ownership(
        metadata_cap: CoinManagerMetadataCap<SIMPLE_COIN>,
        manager: &mut CoinManager<SIMPLE_COIN>
    ) {
        coin_manager::renounce_metadata_ownership(metadata_cap, manager);
    }

    /// Get token balance
    public fun balance(coin: &Coin<SIMPLE_COIN>): u64 {
        coin::value(coin)
    }

/// Get all token metadata in a single call
    public fun get_metadata(manager: &CoinManager<SIMPLE_COIN>): (string::String, ascii::String, string::String, Option<url::Url>, u64) {
        (
            name(manager),
            symbol(manager),
            description(manager),
            icon_url(manager),
            total_supply(manager),

        )
    }

    /// Get token name
    public fun name(manager: &CoinManager<SIMPLE_COIN>): string::String {
        coin_manager::name(manager)
    }

    /// Get token symbol
    public fun symbol(manager: &CoinManager<SIMPLE_COIN>): ascii::String {
        coin_manager::symbol(manager)
    }

    /// Get token decimals
    public fun decimals(manager: &CoinManager<SIMPLE_COIN>): u8 {
        coin_manager::decimals(manager)
    }

    /// Get token description
    public fun description(manager: &CoinManager<SIMPLE_COIN>): string::String {
        coin_manager::description(manager)
    }

    /// Get token icon URL if available
    public fun icon_url(manager: &CoinManager<SIMPLE_COIN>): Option<url::Url> {
        coin_manager::icon_url(manager)
    }

    /// Get total supply
    public fun total_supply(manager: &CoinManager<SIMPLE_COIN>): u64 {
        coin_manager::total_supply(manager)
    }

    /// Get maximum supply if set
    public fun maximum_supply(manager: &CoinManager<SIMPLE_COIN>): u64 {
        coin_manager::maximum_supply(manager)
    }

    /// Check if token has a maximum supply set
    public fun has_maximum_supply(manager: &CoinManager<SIMPLE_COIN>): bool {
        coin_manager::has_maximum_supply(manager)
    }

    /// Check if metadata is immutable
    public fun metadata_is_immutable(manager: &CoinManager<SIMPLE_COIN>): bool {
        coin_manager::metadata_is_immutable(manager)
    }

    /// Check if supply is immutable
    public fun supply_is_immutable(manager: &CoinManager<SIMPLE_COIN>): bool {
        coin_manager::supply_is_immutable(manager)
    }
}