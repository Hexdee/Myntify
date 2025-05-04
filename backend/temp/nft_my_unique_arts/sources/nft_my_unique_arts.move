
module nft_my_unique_arts::my_unique_arts {
    use iota::url::{Self, Url};
    use std::string;
    use iota::event;
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::object::{Self, UID, ID};

    public struct MY_UNIQUE_ARTS has key, store {
        id: UID,
        name: string::String,
        description: string::String,
        url: Url,
    }

    public struct NFTMinted has copy, drop {
        object_id: ID,
        creator: address,
        name: string::String,
    }

    public fun name(nft: &MY_UNIQUE_ARTS): &string::String {
        &nft.name
    }

    public fun description(nft: &MY_UNIQUE_ARTS): &string::String {
        &nft.description
    }

    public fun url(nft: &MY_UNIQUE_ARTS): &Url {
        &nft.url
    }

    #[allow(lint(self_transfer))]
    public fun mint_to_sender(
        name: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let nft = MY_UNIQUE_ARTS {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url)
        };

        event::emit(NFTMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        transfer::public_transfer(nft, sender);
    }

    public fun transfer(
        nft: MY_UNIQUE_ARTS, recipient: address, _: &mut TxContext
    ) {
        transfer::public_transfer(nft, recipient)
    }

    public fun update_description(
        nft: &mut MY_UNIQUE_ARTS,
        new_description: vector<u8>,
        _: &mut TxContext
    ) {
        nft.description = string::utf8(new_description)
    }

    public fun burn(nft: MY_UNIQUE_ARTS, _: &mut TxContext) {
        let MY_UNIQUE_ARTS { id, name: _, description: _, url: _ } = nft;
        id.delete()
    }
}
