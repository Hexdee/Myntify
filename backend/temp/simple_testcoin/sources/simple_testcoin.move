
  
  module simple_testcoin::testcoin {
    use iota::coin;
    use iota::url;

    public struct TESTCOIN has drop {}

    fun init(witness: TESTCOIN, ctx: &mut TxContext) {
      let (mut treasury, metadata) = coin::create_currency(witness, 6, b"TST", b"TestCoin", b"Testing coin", option::some(url::new_unsafe_from_bytes(b"undefined")), ctx);
      let coin = coin::mint(&mut treasury, 5400000, ctx);
      transfer::public_transfer(coin, ctx.sender());
      transfer::public_transfer(metadata, ctx.sender());
      transfer::public_transfer(treasury, ctx.sender());
    }
  }
  