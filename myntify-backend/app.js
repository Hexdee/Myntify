import express from 'express';
import fs, { rm } from 'fs';
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
app.use(cors());
app.use(morgan('dev'));

// Move templates
function generateSimpleCoin(params) {
  return `
module ${params.packageName}::${params.moduleName} {
    use std::string;
    use std::ascii;
    use iota::coin_manager::{Self, CoinManager, CoinManagerTreasuryCap, CoinManagerMetadataCap};
    use iota::coin::{Self, Coin};
    ${params.icon ? 'use iota::url;' : ''}

    public struct ${params.structName} has drop {}

    fun init(witness: ${params.structName}, ctx: &mut TxContext) {
        let icon_url = ${
          params.icon
            ? `option::some(url::new_unsafe_from_bytes(b"${params.icon}"))`
            : 'option::none()'
        };
        let (cm_treasury_cap, cm_meta_cap, mut manager) = coin_manager::create(
            witness,
            ${params.decimals}, 
            b"${params.symbol}",
            b"${params.name}",
            b"${params.description}",
            icon_url,
            ctx
        );

        let initial_amount = ${BigInt(params.totalSupply).toString()};
        let coin = coin_manager::mint(&cm_treasury_cap, &mut manager, initial_amount, ctx);
        transfer::public_transfer(coin, ctx.sender());
        transfer::public_transfer(cm_treasury_cap, ctx.sender());
        
        transfer::public_transfer(cm_meta_cap, ctx.sender());

        transfer::public_share_object(manager);
    }

    /// Mint new tokens
    public entry fun mint(
        treasury_cap: &mut CoinManagerTreasuryCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin_manager::mint(treasury_cap, manager, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Set maximum supply for the token (can only be done once)
    public entry fun set_max_supply(
        treasury_cap: &mut CoinManagerTreasuryCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>,
        max_supply: u64
    ) {
        coin_manager::enforce_maximum_supply(treasury_cap, manager, max_supply)
    }

    /// Transfer tokens to another address
    public entry fun transfer(
        coin: &mut Coin<${params.structName}>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin_to_transfer = coin::split(coin, amount, ctx);
        transfer::public_transfer(coin_to_transfer, recipient);
    }

    /// Burn tokens
    public entry fun burn(
        treasury_cap: &mut CoinManagerTreasuryCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>,
        coin: Coin<${params.structName}>
    ) {
        coin_manager::burn(treasury_cap, manager, coin);
    }

    /// Update token name
    public entry fun update_name(
        metadata_cap: &mut CoinManagerMetadataCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>,
        new_name: string::String
    ) {
        coin_manager::update_name(metadata_cap, manager, new_name);
    }

    /// Update token symbol
    public entry fun update_symbol(
        metadata_cap: &mut CoinManagerMetadataCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>,
        new_symbol: ascii::String
    ) {
        coin_manager::update_symbol(metadata_cap, manager, new_symbol);
    }

    /// Renounce treasury ownership, making supply immutable
    public entry fun renounce_treasury_ownership(
        treasury_cap: CoinManagerTreasuryCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>
    ) {
        coin_manager::renounce_treasury_ownership(treasury_cap, manager);
    }

    /// Renounce metadata ownership, making metadata immutable
    public entry fun renounce_metadata_ownership(
        metadata_cap: CoinManagerMetadataCap<${params.structName}>,
        manager: &mut CoinManager<${params.structName}>
    ) {
        coin_manager::renounce_metadata_ownership(metadata_cap, manager);
    }

    /// Get token balance
    public fun balance(coin: &Coin<${params.structName}>): u64 {
        coin::value(coin)
    }

    /// Get total supply
    public fun total_supply(manager: &CoinManager<${params.structName}>): u64 {
        coin_manager::total_supply(manager)
    }

    /// Get maximum supply if set
    public fun maximum_supply(manager: &CoinManager<${
      params.structName
    }>): u64 {
        coin_manager::maximum_supply(manager)
    }

    /// Check if token has a maximum supply set
    public fun has_maximum_supply(manager: &CoinManager<${
      params.structName
    }>): bool {
        coin_manager::has_maximum_supply(manager)
    }

    /// Check if metadata is immutable
    public fun metadata_is_immutable(manager: &CoinManager<${
      params.structName
    }>): bool {
        coin_manager::metadata_is_immutable(manager)
    }

    /// Check if supply is immutable
    public fun supply_is_immutable(manager: &CoinManager<${
      params.structName
    }>): bool {
        coin_manager::supply_is_immutable(manager)
    }
}
`;
}

// Additional templates for regulated and NFT types can be added here
function generateRegulatedToken(params) {
  return generateSimpleCoin(params); // TODO: replace with real regulated template
}

function generateNFT(params) {
  return generateSimpleCoin(params); // TODO: replace with real NFT template
}

// Helper to create a Move package using IOTA CLI
function createMovePackage(basePath, moduleName, moveCode) {
  execSync(`iota move new ${moduleName}`, { cwd: basePath });
  const sourcesPath = path.join(basePath, moduleName, 'sources');

  fs.writeFileSync(path.join(sourcesPath, `${moduleName}.move`), moveCode);
}

// API Endpoint
app.post('/create-token', async (req, res) => {
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
