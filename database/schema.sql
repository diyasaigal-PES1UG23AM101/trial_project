-- MySQL dump 10.13  Distrib 8.0.43, for macos15 (arm64)
--
-- Host: localhost    Database: it_infrastructure
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Admin table
CREATE TABLE IF NOT EXISTS Admin (
  Admin_ID INT AUTO_INCREMENT PRIMARY KEY,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(100) NOT NULL UNIQUE,
  Password_Hash VARCHAR(255) NOT NULL,
  Full_Name VARCHAR(100),
  Role VARCHAR(50),
  Is_Active BOOLEAN DEFAULT 1,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Last_Login TIMESTAMP NULL DEFAULT NULL
);

-- Role table
CREATE TABLE IF NOT EXISTS Role (
  Role_ID INT AUTO_INCREMENT PRIMARY KEY,
  Role_Name VARCHAR(50) NOT NULL UNIQUE,
  Description TEXT,
  Permissions JSON,
  Is_Active BOOLEAN DEFAULT 1,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User table (if referenced by roles)
CREATE TABLE IF NOT EXISTS User (
  User_ID INT AUTO_INCREMENT PRIMARY KEY,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(100) NOT NULL UNIQUE,
  Password_Hash VARCHAR(255) NOT NULL,
  Full_Name VARCHAR(100),
  Department VARCHAR(100),
  Is_Active BOOLEAN DEFAULT 1,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role assignment table
CREATE TABLE IF NOT EXISTS User_Role (
  User_Role_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Role_ID INT NOT NULL,
  Assigned_By INT NULL,
  Assigned_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Is_Active BOOLEAN DEFAULT 1,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
  FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID) ON DELETE CASCADE,
  FOREIGN KEY (Assigned_By) REFERENCES Admin(Admin_ID) ON DELETE SET NULL,
  UNIQUE KEY unique_user_role (User_ID, Role_ID)
);

-- Asset table with employee assignment support
CREATE TABLE IF NOT EXISTS Asset (
  Asset_ID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(150) NOT NULL,
  Serial_Number VARCHAR(120) UNIQUE,
  Category VARCHAR(120),
  Status VARCHAR(50) DEFAULT 'active',
  Purchase_Date DATE,
  Warranty_End_Date DATE,
  Assigned_User_ID INT NULL,
  Assigned_User_Name VARCHAR(150),
  Assigned_User_Login VARCHAR(150),
  Location VARCHAR(150),
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (Assigned_User_ID) REFERENCES User(User_ID) ON DELETE SET NULL
);

-- Asset Table - Stores IT assets (hardware, software, etc.)
CREATE TABLE IF NOT EXISTS Asset (
    Asset_ID INT PRIMARY KEY AUTO_INCREMENT,
    Asset_Name VARCHAR(100) NOT NULL,
    Asset_Type ENUM('Hardware', 'Software', 'License', 'Other') NOT NULL,
    Serial_Number VARCHAR(100) UNIQUE,
    Manufacturer VARCHAR(100),
    Model VARCHAR(100),
    Purchase_Date DATE,
    Purchase_Cost DECIMAL(10, 2),
    Status ENUM('Available', 'Assigned', 'Maintenance', 'Retired') DEFAULT 'Available',
    Location VARCHAR(100),
    Description TEXT,
    Is_Active BOOLEAN DEFAULT TRUE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Asset_Assignment Table - Links assets to employees
CREATE TABLE IF NOT EXISTS Asset_Assignment (
    Assignment_ID INT PRIMARY KEY AUTO_INCREMENT,
    Asset_ID INT NOT NULL,
    User_ID INT NOT NULL,
    Assigned_By INT,
    Assigned_Date DATE NOT NULL,
    Return_Date DATE NULL,
    Notes TEXT,
    Is_Active BOOLEAN DEFAULT TRUE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Asset_ID) REFERENCES Asset(Asset_ID) ON DELETE CASCADE,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Assigned_By) REFERENCES Admin(Admin_ID) ON DELETE SET NULL
);

-- Note: Admin user will be created using the setup-admin.js script
-- This ensures proper password hashing with bcrypt
-- Run: node database/setup-admin.js (from project root)

