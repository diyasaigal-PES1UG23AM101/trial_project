-- Migration script to add Role, User, and User_Role tables
-- Run this if you already have the Admin table and need to add the new tables

USE it_infrastructure;

-- Role Table - Stores available roles in the system
CREATE TABLE IF NOT EXISTS Role (
    Role_ID INT PRIMARY KEY AUTO_INCREMENT,
    Role_Name VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT,
    Permissions JSON,
    Is_Active BOOLEAN DEFAULT TRUE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Table - Stores all users (Admin, IT Staff, Employee)
CREATE TABLE IF NOT EXISTS User (
    User_ID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255),
    Full_Name VARCHAR(100) NOT NULL,
    Employee_ID VARCHAR(50) UNIQUE,
    Department VARCHAR(100),
    Is_Active BOOLEAN DEFAULT TRUE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Last_Login TIMESTAMP NULL,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User_Role Table - Many-to-many relationship between Users and Roles
CREATE TABLE IF NOT EXISTS User_Role (
    User_Role_ID INT PRIMARY KEY AUTO_INCREMENT,
    User_ID INT NOT NULL,
    Role_ID INT NOT NULL,
    Assigned_By INT,
    Assigned_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Is_Active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID) ON DELETE CASCADE,
    FOREIGN KEY (Assigned_By) REFERENCES Admin(Admin_ID) ON DELETE SET NULL,
    UNIQUE KEY unique_user_role (User_ID, Role_ID)
);

