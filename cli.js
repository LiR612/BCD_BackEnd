const { ethers } = require("ethers"); // v6-style
require("dotenv").config();
const db = require("./db");

// Load contract ABI
const MedicineAuthenticityABI = require("./artifacts/contracts/MedicineAuthenticity.sol/MedicineAuthenticity.json").abi;

// Constants and configuration
const PROVIDER_URL = process.env.PROVIDER_URL || "http://localhost:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicineAuthenticityABI, wallet);

/**
 * Grant admin role to an address
 * @param {string} address - The address to grant admin role to
 */
async function grantAdminRole(address) {
  try {
    // Validate address format
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }

    const adminRole = await contract.ADMIN_ROLE();
    const tx = await contract.grantRole(adminRole, address);
    await tx.wait();
    console.log(`✅ Granted ADMIN_ROLE to ${address}`);
  } catch (error) {
    console.error(`❌ Failed to grant admin role: ${error.message}`);
    throw error;
  }
}

/**
 * Add a product to both blockchain and database
 * @param {string} productID - Unique product identifier
 * @param {string} productType - Product Type
 * @param {string} batchNumber - Product batch number
 */
async function addProduct(productID, productType, batchNumber) {
  try {
    // Input validation
    if (!productID || !productType || !batchNumber) {
      throw new Error("Product ID, Type, and batch number are required");
    }
    const manufacturingDate = new Date();
    const expiryDate = new Date(manufacturingDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    // Format dates as ISO strings
    const mfgDateStr = manufacturingDate.toISOString();
    const expiryDateStr = expiryDate.toISOString();

    // Calculate product hash using keccak256
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const productHash = ethers.keccak256(
      abiCoder.encode(
        ["string", "string", "string", "string", "string"],[productID, productType, batchNumber, mfgDateStr, expiryDateStr]
      )    
    );
    
    // Check if product already exists on the blockchain
    try {
      const exists = await contract.productExists(productID);
      if (exists) {
        throw new Error(`Product ${productID} already exists on blockchain`);
      }
    } catch (error) {
      if (!error.message.includes("Product")) {
        throw error;
      }
    }

    // Add product to blockchain
    console.log(`Adding product ${productID} to blockchain...`);
    const tx = await contract.addProduct(productID, productHash);
    await tx.wait();
    console.log(`✅ Added product ${productID} with hash ${productHash} to blockchain`);

    // Add product to database
    await db.query(
      `INSERT INTO products (product_id, product_type, batch_number, manufacturing_date, expiry_date, product_hash) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [productID, productType, batchNumber, mfgDateStr, expiryDateStr, productHash]
    );
    console.log(`✅ Added product ${productID} to database`);
    
    return { productID, productHash };
  } catch (error) {
    console.error(`❌ Failed to add product: ${error.message}`);
    throw error;
  }
}

/**
 * Verify product authenticity by comparing blockchain and database hashes
 * @param {string} productID - The product ID to verify
 * @returns {Object} - Verification result with status and details
 */
async function verifyProduct(productID) {
  try {
    if (!productID) {
      throw new Error("Product ID is required");
    }

    // Get product from database
    const result = await db.query("SELECT * FROM products WHERE product_id = $1", [productID]);
    if (result.rows.length === 0) {
      throw new Error(`Product ${productID} not found in database`);
    }
    
    const metadata = result.rows[0];
    // Get product hash from blockchain
    const blockchainHash = await contract.getProductHash(productID);
    
    // Calculate hash from database values
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const calculatedHash = ethers.keccak256(
      abiCoder.encode(
        ["string", "string", "string", "string", "string"],
        [
          metadata.product_id,
          metadata.product_type,
          metadata.batch_number,
          new Date(metadata.manufacturing_date).toISOString(),
          new Date(metadata.expiry_date).toISOString()
        ]
      )
    );
    
    // Compare hashes
    const isAuthentic = calculatedHash === blockchainHash;
    
    const verificationResult = {
      productID,
      isAuthentic,
      databaseHash: calculatedHash,
      blockchainHash,
      metadata
    };
    
    if (isAuthentic) {
      console.log(`✅ Product ${productID} is authentic`);
    } else {
      console.log(`❌ Product ${productID} authenticity could not be verified❗`);
      console.log(`Database hash: ${calculatedHash}`);
      console.log(`Blockchain hash: ${blockchainHash}`);
    }
    
    return verificationResult;
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
    throw error;
  }
}

/**
 * Add a stage to a product's lifecycle
 * @param {string} productID - The product ID
 * @param {string} stageName - The name of the stage
 */
async function addStage(productID, stageName) {
  try {
    if (!productID || !stageName) {
      throw new Error("Product ID and stage name are required");
    }
    
    const tx = await contract.addStage(productID, stageName);
    await tx.wait();
    console.log(`✅ Added stage "${stageName}" to product ${productID}`);
    
    return { productID, stageName };
  } catch (error) {
    console.error(`❌ Failed to add stage: ${error.message}`);
    throw error;
  }
}

/**
 * Get a product's complete history
 * @param {string} productID - The product ID
 * @returns {Array} - Array of stage objects
 */
async function getProductHistory(productID) {
  try {
    if (!productID) {
      throw new Error("Product ID is required");
    }
    
    const stages = await contract.getProductHistory(productID);
    
    const formattedStages = stages.map(stage => ({
      stageName: stage.stageName,
      authenticator: stage.authenticator,
      timestamp: new Date(Number(stage.timestamp) * 1000).toISOString()
    }));
    
    console.log(`📋 History for product ${productID}:`);
    formattedStages.forEach((stage, index) => {
      console.log(`  ${index + 1}. ${stage.stageName} - Authenticated by ${stage.authenticator} at ${stage.timestamp}`);
    });
    
    return formattedStages;
  } catch (error) {
    console.error(`❌ Failed to get product history: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to handle CLI commands
 */
async function main() {
  try {
    const [command, ...args] = process.argv.slice(2);
    
    switch (command) {
      case "addProduct":
        await addProduct(args[0], args[1], args[2]);
        break;
      
      case "verify":
        await verifyProduct(args[0]);
        break;
      
      case "grantAdmin":
        await grantAdminRole(args[0]);
        break;
      
      case "addStage":
        await addStage(args[0], args[1]);
        break;
      
      case "getHistory":
        await getProductHistory(args[0]);
        break;
      
      default:
        console.log(`
📋 Available commands:
  addProduct <id> <type> <batch>     - Add a new product
  verify <id>                        - Verify product authenticity
  grantAdmin <address>               - Grant admin role to address
  addStage <id> <stageName>          - Add a stage to product lifecycle
  getHistory <id>                    - Get product history
        `);
    }
  } catch (error) {
    console.error(`❌ Error in main: ${error.message}`);
    process.exit(1)
  }
}

// Execute main function
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for testing or external use
module.exports = {
  addProduct,
  verifyProduct,
  grantAdminRole,
  addStage,
  getProductHistory
};