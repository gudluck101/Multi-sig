const fs = require('fs');
const StellarSdk = require('stellar-sdk');

const bot = JSON.parse(fs.readFileSync('bot.json', 'utf-8'));

const server = new StellarSdk.Server('https://api.mainnet.minepi.com');

async function setupMultisig() {
  const masterKeypair = StellarSdk.Keypair.fromSecret(bot.masterSecret);
  const masterPublic = masterKeypair.publicKey();
  const signerPublic = bot.signerPublic;

  console.log(`🔐 Setting up multisig for wallet: ${masterPublic}`);
  console.log(`➕ Adding signer: ${signerPublic}`);

  try {
    const account = await server.loadAccount(masterPublic);
    const baseFee = await server.fetchBaseFee();

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: baseFee.toString(),
      networkPassphrase: 'Pi Network',
    })
      .addOperation(StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signerPublic,
          weight: 1,
        }
      }))
      .addOperation(StellarSdk.Operation.setOptions({
        masterWeight: 1,
        lowThreshold: 2,
        medThreshold: 2,
        highThreshold: 2,
      }))
      .setTimeout(60)
      .build();

    tx.sign(masterKeypair);

    const result = await server.submitTransaction(tx);

    if (result.successful || result.hash) {
      console.log(`✅ Multisig setup complete! TX Hash: ${result.hash}`);
    } else {
      console.log(`❌ Setup failed.`, result);
    }

  } catch (e) {
    console.error('❌ Error setting up multisig');
    if (e?.response?.data) console.log(e.response.data);
    else console.log(e.toString());
  }
}

setupMultisig();
