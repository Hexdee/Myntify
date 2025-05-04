import { getFaucetHost, requestIotaFromFaucetV0 } from '@iota/iota-sdk/faucet';

await requestIotaFromFaucetV0({
    host: getFaucetHost('testnet'),
    recipient: '0x640e172884305c2b57c9bab9f1ab43698f45e003821c7d48e575538a95d4c84a',
});
