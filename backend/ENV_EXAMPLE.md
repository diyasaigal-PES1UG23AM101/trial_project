# Environment Variables Configuration

Copy this content to create your `.env` file in the `backend` folder:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=it_infrastructure

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_to_something_secure

# Admin Setup (for initial admin creation)
ADMIN_DEFAULT_PASSWORD=admin123
```

## Instructions

1. Create a file named `.env` in the `backend` folder
2. Copy the content above into the file
3. Replace `your_mysql_password` with your actual MySQL password
4. Replace `your_super_secret_jwt_key_here_change_this_to_something_secure` with a strong secret key
5. Save the file

**Important:** Never commit the `.env` file to version control!

