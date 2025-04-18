# README

# Medicine Authenticity Backend

This project is a backend for a Decentralized Application (Dapp) to combat counterfeit medicine products using blockchain and a database. It uses Hardhat for the blockchain, PostgreSQL for the database, and a Node.js CLI for interaction.

- **Blockchain:** Tracks product lifecycle stages and authenticity using a Solidity smart contract (`MedicineAuthenticity.sol`).
- **Database:** Stores product metadata and scan logs in PostgreSQL.
- **CLI:** Provides commands to add products, add stages, and scan products.

## Prerequisites

Before running the project, ensure you have the following installed on your machine:

1. **Node.js and npm:**

   - Download and install Node.js (which includes npm) from [nodejs.org](https://nodejs.org). Use the LTS version (e.g., 20.x as of April 2025).
   - Verify installation:
     ```cmd
     node -v
     npm -v
     ```

2. **PostgreSQL:**

   - Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/). Use the latest version (e.g., 16.x).
   - During installation, set a password for the `postgres` user (e.g., `Me@PostgreSQL`).
   - Ensure `pgAdmin` (a GUI tool) is installed for easier database management (included by default).
   - Add PostgreSQL’s `bin` directory to your system PATH (e.g., `C:\Program Files\PostgreSQL\16\bin`):
     - Open "Environment Variables" (search in Windows).
     - Add the path to the `Path` variable under "System variables" or "User variables".

3. **Command Prompt (cmd) or Terminal:**
   - These instructions use Windows Command Prompt (cmd). If you’re on macOS/Linux, adjust commands accordingly (e.g., use `bash` syntax).

## Project Setup

### 1. Unzip the Project

- Unzip the `medicine-authenticity-backend` folder to a location on your machine (e.g., `C:\Users\YourUser\Documents\medicine-authenticity-backend`).

### 2. Navigate to the Project Directory

Open a Command Prompt (cmd) and navigate to the project directory:

```cmd
cd C:\Users\YourUser\Documents\medicine-authenticity-backend
```

Replace `YourUser` with your actual username.

### 3. Install Dependencies

The project dependencies are listed in `package.json`. Install them using npm:

```cmd
npm install
```

This will install:

- `hardhat`, `@nomicfoundation/hardhat-toolbox`, `ethers`, `@openzeppelin/contracts` (for blockchain).
- `pg`, `dotenv`, `express` (for database and CLI).

### 4. Set Up the PostgreSQL Database (For the first time only - else skip this step)

The project uses PostgreSQL to store product metadata and scan logs.

#### Start the PostgreSQL Service

1. Open the Services app (search for "Services" in Windows or run `services.msc`).
2. Find `postgresql-x64-16` (or similar, depending on your version).
3. Ensure it’s running. If not, right-click and select "Start."
   - Alternatively, start it via Command Prompt:
     ```cmd
     net start postgresql-x64-16
     ```

#### Create the Database and Tables

1. Open Command Prompt and connect to PostgreSQL:

   ```cmd
   psql -U postgres
   ```

   - Enter the password you set during installation (e.g., `Me@PostgreSQL`).
   - If you can’t connect (e.g., "password authentication failed"), reset the password:
     ```sql
     ALTER USER postgres WITH PASSWORD 'Me@PostgreSQL';
     \q
     ```
     Then retry the connection.

2. Create the database and tables:
   ```sql
   CREATE DATABASE medicine_authenticity;
   \c medicine_authenticity
   CREATE TABLE products (
      product_id VARCHAR(50) PRIMARY KEY,
      product_type TEXT,
      batch_number VARCHAR(50),
      manufacturing_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      product_hash VARCHAR(66) NOT NULL
   );
   \q
   ```

#### (Alternative) Use pgAdmin

If you prefer a GUI, use `pgAdmin` (installed with PostgreSQL):

1. Open `pgAdmin`.
2. Log in with the `postgres` user and your password.
3. Create a new database named `medicine_authenticity`.
4. Open a query tool and run the `CREATE TABLE` statements above.

### 5. Configure Environment Variables

The project uses a `.env` file to store database credentials. Edit the .env file accordingly:

1. Open a text editor (e.g., Notepad, VS Code).

   ```
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=YOURPASSWORD
   DB_NAME=medicine_authenticity
   DB_PORT=5432
   ```

   - Do **not** add quotes around the values (e.g., `DB_PASSWORD=Me@PostgreSQL`, not `DB_PASSWORD="Me@PostgreSQL"`).

2. Save the file as `.env` (not `.env.txt`):
   - In Notepad, set "Save as type" to "All Files (_._)" to avoid adding a `.txt` extension.

### 6. Start the Hardhat Node

The project uses Hardhat to run a local blockchain for the smart contract.

1. Open a new Command Prompt window and navigate to the project directory:

   ```cmd
   cd C:\Users\YourUser\Documents\medicine-authenticity-backend
   ```

2. Start the Hardhat node:
   ```cmd
   npx hardhat node
   ```
   - This starts a local Ethereum network on `http://localhost:8545`.
   - Note one of the default private keys (e.g., `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`) and an account address (e.g., `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`).
   - Keep this window open while running the project.

### 7. Deploy the Smart Contract

The Hardhat node resets its state each time you restart it, so you need to redeploy the `MedicineAuthenticity` contract.

1. Open another Command Prompt window and navigate to the project directory:

   ```cmd
   cd C:\Users\YourUser\Documents\medicine-authenticity-backend
   ```

2. Deploy the contract:

   ```cmd
   npx hardhat compile
   ```

   ```cmd
   npx hardhat run scripts/deploy.js --network localhost
   ```

   - This will compile and deploy the contract.
   - Note the contract address in the output (e.g., `0x5FbDB2315678afecb367f032d93F642f64180aa3`).

3. Update `cli.js` with the new contract address:
   - Open `cli.js` in a text editor.
   - Update the `contract` instantiation with the new address:
     ```javascript
     const contract = new ethers.Contract(
       "0x5FbDB2315678afecb367f032d93F642f64180aa3",
       MedicineAuthenticityABI,
       wallet
     );
     ```
     Replace `0x5FbDB2315678afecb367f032d93F642f64180aa3` with the new address.

### 8. Run CLI Commands

With the Hardhat node running and the contract deployed, you can now run the CLI commands in the second Command Prompt window:

1. **Add a Product:**

   ```cmd
   node cli.js addProduct "P1234" "Aspirin" "B001"
   ```

2. **Add Stages:**

   ```cmd
   node cli.js addStage "P1234" "Packaged"
   node cli.js addStage "P1234" "Shipped"
   ```

3. **Verify the Product:**
   ```cmd
   node cli.js verify "P1234"
   ```

### 9. Stop the Hardhat Node (When Done)

When you’re finished, stop the Hardhat node by pressing `Ctrl + C` in the Command Prompt window where `npx hardhat node` is running.

# ❗❗If restart blockchain, make sure to clear database tables as well, else there will be a conflict

To Consider : these info for the products table : last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
