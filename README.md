# LocalityApp 🏘️

An offline-first community application for your locality — chat, announcements, and token-based payments — runs entirely on a local LAN/hotspot. No internet required after setup.

---

## Features

- 💬 **Real-time chat** — direct messages + locality group (WebSocket/STOMP)
- 📢 **Notice board** — admin posts announcements with tags (urgent, water, event, etc.)
- 💰 **Token wallet** — 1 token = ₹1, buy tokens from admin, spend at local shops
- 📲 **QR payments** — shopkeepers display QR, customers scan and pay in tokens
- 🌙 **Nightly settlement** — auto-calculates shopkeeper payouts at 22:00 every day
- 👥 **People directory** — browse all residents and shops
- 🔒 **Admin-only registration** — no public signup, admin registers each member
- 📱 **PWA** — installs to home screen on any phone

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Spring Boot 3.2, Spring Security  |
| Realtime   | WebSocket + STOMP                 |
| Database   | PostgreSQL                        |
| Auth       | JWT (stateless)                   |
| Frontend   | React 18 + Vite                   |
| Styling    | Tailwind CSS                      |
| State      | Zustand + React Context           |

---

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```sql
CREATE DATABASE locality_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE locality_db TO postgres;
```

### 2. Backend

```bash
cd backend

# Edit src/main/resources/application.properties if needed:
# spring.datasource.url=jdbc:postgresql://localhost:5432/locality_db
# spring.datasource.username=postgres
# spring.datasource.password=postgres

mvn spring-boot:run
```

On first run, an **admin account** is auto-created:
- Phone: `9999999999`
- Password: `admin123`

> Change these in `application.properties` before going live!

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — or from another device on the same hotspot, open `http://<YOUR_IP>:3000`

---

## Hotspot Testing (LAN simulation)

1. Enable hotspot on the machine running the backend
2. Find your local IP:
   - Windows: `ipconfig` → look for `192.168.x.x`
   - Linux/Mac: `ip addr` or `ifconfig`
3. Update `frontend/vite.config.js` proxy targets to use that IP if needed
4. Connect other devices to the hotspot and navigate to `http://<IP>:3000`

---

## Admin Workflow

### Register a new member
1. Go to Admin → Register tab
2. Fill in name, phone, password, role
3. Share the phone + password with the member in person

### Top up a wallet
1. Collect cash from the member
2. Go to Admin → Top-Up tab
3. Select the member, enter amount, click Add

### Nightly settlement
- Runs **automatically at 22:00** every day
- Creates settlement records for each shopkeeper's daily total
- Go to Admin → Settlements to see pending payouts
- Transfer money via UPI manually, then click "Mark as Paid"
- Or click "Run Now" to trigger early

---

## Project Structure

```
locality-app/
├── backend/
│   └── src/main/java/com/locality/app/
│       ├── config/          # Security, WebSocket, FileStorage, AdminBootstrap
│       ├── controller/      # REST controllers
│       ├── dto/             # Request/Response DTOs
│       ├── entity/          # JPA entities
│       ├── enums/           # Role, TransactionType, SettlementStatus
│       ├── exception/       # AppException, GlobalExceptionHandler
│       ├── repository/      # Spring Data JPA repos
│       ├── security/        # JWT, filters, UserDetailsService
│       ├── service/         # Business logic
│       └── websocket/       # STOMP message controllers
└── frontend/
    └── src/
        ├── api/             # axios instance + service functions
        ├── context/         # AuthContext, WsContext
        ├── hooks/           # useRooms
        ├── pages/           # LoginPage, ChatPage, AnnouncementsPage,
        │                    # WalletPage, PeoplePage, ProfilePage, AdminPage
        └── components/
            └── layout/      # MainLayout (sidebar + mobile nav)
```

---

## Roles

| Role        | Can do                                                     |
|-------------|------------------------------------------------------------|
| ADMIN       | Register users, top-up wallets, manage settlements, post announcements |
| RESIDENT    | Chat, read notices, pay shops with tokens                  |
| SHOPKEEPER  | Chat, read notices, receive token payments, view QR code   |

---

## API Endpoints

| Method | Path                             | Auth         | Description               |
|--------|----------------------------------|--------------|---------------------------|
| POST   | /api/auth/login                  | Public       | Login                     |
| GET    | /api/users/me                    | Any user     | Get own profile           |
| GET    | /api/users                       | Any user     | Get all users             |
| GET    | /api/chat/rooms                  | Any user     | Get my chat rooms         |
| POST   | /api/chat/rooms/direct/{userId}  | Any user     | Open/create DM            |
| GET    | /api/chat/rooms/{id}/messages    | Any user     | Get messages              |
| POST   | /api/chat/upload                 | Any user     | Upload image              |
| GET    | /api/announcements               | Any user     | Get announcements (paged) |
| POST   | /api/announcements               | ADMIN        | Post announcement         |
| GET    | /api/wallet/me                   | Any user     | Get my wallet             |
| GET    | /api/wallet/transactions         | Any user     | Get transactions          |
| POST   | /api/wallet/pay                  | RESIDENT     | Pay shopkeeper            |
| POST   | /api/admin/users/register        | ADMIN        | Register user             |
| PATCH  | /api/admin/users/{id}/toggle     | ADMIN        | Enable/disable user       |
| POST   | /api/admin/wallet/topup          | ADMIN        | Top up wallet             |
| GET    | /api/admin/settlements/pending   | ADMIN        | Get pending settlements   |
| PATCH  | /api/admin/settlements/{id}/paid | ADMIN        | Mark settlement paid      |
| POST   | /api/admin/settlements/run       | ADMIN        | Trigger settlement job    |

---

## WebSocket Topics

| Destination              | Direction       | Description               |
|--------------------------|-----------------|---------------------------|
| /app/chat.send           | Client → Server | Send a message            |
| /app/chat.typing         | Client → Server | Typing indicator          |
| /topic/room.{roomId}     | Server → Client | New message in room       |
| /topic/room.{id}.typing  | Server → Client | Typing event in room      |
| /topic/announcements     | Server → Client | New announcement pushed   |
| /topic/announcements.delete | Server → Client | Announcement deleted   |