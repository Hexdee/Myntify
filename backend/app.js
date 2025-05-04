import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: '*',
  })
);
app.use(morgan('dev'));
// Move templates
function generateSimpleCoin(params) {
  return `
  
  module ${params.packageName}::${params.moduleName} {
    use iota::coin;
    use iota::url;

    public struct ${params.structName} has drop {}

    fun init(witness: ${params.structName}, ctx: &mut TxContext) {
      let (mut treasury, metadata) = coin::create_currency(witness, ${params.decimals}, b"${params.symbol}", b"${params.name}", b"${params.description}", option::some(url::new_unsafe_from_bytes(b"${params.icon}")), ctx);
      let coin = coin::mint(&mut treasury, ${params.totalSupply}, ctx);
      transfer::public_transfer(coin, ctx.sender());
      transfer::public_transfer(metadata, ctx.sender());
      transfer::public_transfer(treasury, ctx.sender());
    }
  }
  `;
}

// Additional templates for regulated and NFT types can be added here
function generateRegulatedToken(params) {
  return generateSimpleCoin(params); // TODO: replace with real regulated template
}

function generateNFT(params) {
  return `
module ${params.packageName}::${params.moduleName} {
    use iota::url::{Self, Url};
    use std::string;
    use iota::event;

    public struct ${params.structName} has key, store {
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

    public fun name(nft: &${params.structName}): &string::String {
        &nft.name
    }

    public fun description(nft: &${params.structName}): &string::String {
        &nft.description
    }

    public fun url(nft: &${params.structName}): &Url {
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
        let nft = ${params.structName} {
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
        nft: ${params.structName}, recipient: address, _: &mut TxContext
    ) {
        transfer::public_transfer(nft, recipient)
    }

    public fun update_description(
        nft: &mut ${params.structName},
        new_description: vector<u8>,
        _: &mut TxContext
    ) {
        nft.description = string::utf8(new_description)
    }

    public fun burn(nft: ${params.structName}, _: &mut TxContext) {
        let ${params.structName} { id, name: _, description: _, url: _ } = nft;
        id.delete()
    }
}
`;
}

// Helper to create a Move package using IOTA CLI
function createMovePackage(basePath, moduleName, moveCode) {
  execSync(`iota move new ${moduleName}`, { cwd: basePath });
  const sourcesPath = path.join(basePath, moduleName, 'sources');

  fs.writeFileSync(path.join(sourcesPath, `${moduleName}.move`), moveCode);
}

// API Endpoint
app.post('/create-token', async (req, res) => {
  if (req.body.type === 'NFT') {
    req.body.decimals = 0;
    req.body.totalSupply = 1;
  }
  const { type, name, symbol, decimals, description, icon, totalSupply } =
    req.body;

  // Validate required fields
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }
  if (decimals == undefined) {
    return res.status(400).json({ error: 'decimals is required' });
  }
  if (totalSupply == undefined) {
    return res.status(400).json({ error: 'totalSupply is required' });
  }

  // Validate field lengths
  if (name.length < 1 || name.length > 50) {
    return res
      .status(400)
      .json({ error: 'Name must be between 1 and 50 characters' });
  }

  if (symbol.length < 1 || symbol.length > 5) {
    return res
      .status(400)
      .json({ error: 'Token symbol should be max 5 characters' });
  }

  if (description.length < 1 || description.length > 200) {
    return res
      .status(400)
      .json({ error: 'Description must be between 1 and 200 characters' });
  }

  if (isNaN(decimals) || decimals < 0) {
    return res
      .status(400)
      .json({ error: 'Decimals must be a non-negative integer' });
  }

  if (isNaN(totalSupply) || totalSupply < 0) {
    return res
      .status(400)
      .json({ error: 'Total supply must be a non-negative integer' });
  }

  if (icon && URL.canParse(icon) === false) {
    console.log('Icon is not a valid URL');
    return res.status(400).json({ error: 'Icon must be a valid URL' });
  }

  if (!['SIMPLE', 'REGULATED', 'NFT'].includes(type)) {
    return res.status(400).json({ error: 'Invalid token type' });
  }

  // Convert token name to snake_case for module name
  const snakeCaseModuleName = name.toLowerCase().replace(/\s+/g, '_');

  // Combine type and snake case name for package name
  const tempDir = path.join(__dirname, 'temp');
  // Create temp dir if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const packageName = `${type.toLowerCase()}_${snakeCaseModuleName}`;
  const packagePath = path.join(tempDir, packageName);

  try {
    // Use uppercase version of snake case name for struct
    const uppercaseStructName = snakeCaseModuleName.toUpperCase();

    const params = {
      packageName,
      moduleName: snakeCaseModuleName,
      structName: uppercaseStructName,
      name,
      decimals,
      symbol,
      description,
      icon,
      totalSupply,
    };

    let moveCode;
    if (type === 'SIMPLE') moveCode = generateSimpleCoin(params);
    if (type === 'REGULATED') moveCode = generateRegulatedToken(params);
    if (type === 'NFT') moveCode = generateNFT(params);

    createMovePackage(tempDir, packageName, moveCode);

    const compileOutput = execSync(
      `iota move build --dump-bytecode-as-base64 --path ${packagePath}`,
      { encoding: 'utf-8' }
    );

    res.json(JSON.parse(compileOutput));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    // Clean up the temporary package
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to clean up temporary package:', cleanupError);
    }
  }
});

export default app;
