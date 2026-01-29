# MyNAS - Premium Private Cloud

MyNAS is a premium, self-hosted cloud storage system featuring a beautiful, responsive glassmorphism UI. It is designed to be lightweight, fast, and easy to deploy on anything from a high-end server to a Raspberry Pi.

![MyNAS UI](https://placehold.co/800x400/1e293b/64748b?text=MyNAS+Dashboard)

## ✨ Features

- **Modern Glassmorphism UI**: Built with React, Vite, and Framer Motion for sleek animations and a premium feel.
- **File Management**: Upload (drag & drop), rename, move, delete, and download files.
- **Folder Downloads**: Automatically zips folders on the fly for easy downloading.
- **Smart Sharing**: Generate temporary public links for files or folders.
- **Trash Bin**: Safely recover deleted items.
- **Favorites**: Star important files for quick access.
- **Media Preview**: Built-in support for previewing images and common file types.
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS (v4), Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **Data**: JSON-based metadata (no database server required).
- **Storage**: disk-based storage with streaming uploads/downloads.

## 💻 System Requirements

MyNAS is designed to be extremely efficient.

| Requirement | Minimum | Recommended |
|:---|:---|:---|
| **CPU** | 1 vCPU (e.g., Pi 3) | 2 vCPU (Faster zipping) |
| **RAM** | 512 MB | 1 GB+ |
| **Node.js** | v18.x | v20.x or newer |

## 🚀 Quick Start

### 1. Installation
Clone the repository and install dependencies:

```bash
# Install root dependencies (Backend)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Build Frontend
Before running the server, you need to build the React frontend:

```bash
npm run build
```

### 3. Start Server
Run the NAS system:

```bash
# Using the provided batch file (Windows)
.\start_nas.bat

# Or using npm
npm start
```

Access the dashboard at: **`http://localhost:3000`**

## 🔧 Development

To run the project in development mode with hot-reloading:

```bash
npm run dev
```
*This runs both the backend server (port 3000) and the Vite frontend dev server (usually port 5173).*

## 📂 Project Structure

- **`/storage`**: This is where your actual files are stored. Do not modify this folder manually if possible to keep metadata in sync.
- **`nas-metadata.json`**: Stores data about starred files, trash bin, and shared links.
- **`/frontend`**: React application source code.
- **`server.js`**: Main Node.js express application.

## ⚠️ Notes

- **Large Filez**: The system supports streaming, so you can upload/download files larger than your RAM.
- **Compression**: Folder downloads use Level 9 (Max) compression by default. If running on very low-end hardware, you may want to lower this in `server.js` to reduce CPU load.
