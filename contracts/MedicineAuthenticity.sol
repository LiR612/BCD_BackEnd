// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MedicineAuthenticity
 * @dev Contract for tracking and verifying the authenticity of medicine products
 */
contract MedicineAuthenticity is AccessControl {
    // Role identifier for admin capabilities
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Stage {
        string stageName;
        address authenticator;
        uint256 timestamp;
    }

    struct Product {
        string productID;
        string productHash;
        Stage[] stages;
        bool exists;
    }

    // Mapping to store product information
    mapping(string => Product) private products;

    // Events
    event ProductAdded(string indexed productID, string productHash);
    event StageAdded(
        string indexed productID,
        string stageName,
        address authenticator
    );

    /**
     * @dev Constructor that grants admin role to the contract deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Set DEFAULT_ADMIN_ROLE as the admin of ADMIN_ROLE
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @dev Add a new product with its hash to the blockchain
     * @param _productID The unique ID of the product
     * @param _productHash The hash of the product details
     */
    function addProduct(
        string memory _productID,
        string memory _productHash
    ) public onlyRole(ADMIN_ROLE) {
        require(bytes(_productID).length > 0, "Product ID cannot be empty");
        require(bytes(_productHash).length > 0, "Product hash cannot be empty");
        require(!products[_productID].exists, "Product already exists");

        products[_productID].productID = _productID;
        products[_productID].productHash = _productHash;
        products[_productID].exists = true;

        emit ProductAdded(_productID, _productHash);
    }

    /**
     * @dev Add a stage to an existing product's lifecycle
     * @param _productID The ID of the product to add a stage to
     * @param _stageName The name of the stage being added
     */
    function addStage(
        string memory _productID,
        string memory _stageName
    ) public onlyRole(ADMIN_ROLE) {
        require(bytes(_stageName).length > 0, "Stage name cannot be empty");
        require(products[_productID].exists, "Product does not exist");

        products[_productID].stages.push(
            Stage({
                stageName: _stageName,
                authenticator: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit StageAdded(_productID, _stageName, msg.sender);
    }

    /**
     * @dev Get the hash stored for a specific product
     * @param _productID The ID of the product to query
     * @return The product hash
     */
    function getProductHash(
        string memory _productID
    ) public view returns (string memory) {
        require(products[_productID].exists, "Product does not exist");
        return products[_productID].productHash;
    }

    /**
     * @dev Get the full history of stages for a product
     * @param _productID The ID of the product to query
     * @return Array of Stage structs representing the product history
     */
    function getProductHistory(
        string memory _productID
    ) public view returns (Stage[] memory) {
        require(products[_productID].exists, "Product does not exist");
        return products[_productID].stages;
    }

    /**
     * @dev Check if a product exists
     * @param _productID The ID of the product to check
     * @return Boolean indicating if the product exists
     */
    function productExists(
        string memory _productID
    ) public view returns (bool) {
        return products[_productID].exists;
    }
}
