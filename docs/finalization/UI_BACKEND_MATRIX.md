# UI ↔ Backend Contract Matrix

| Screen/Feature | UI Action | Required API | Existing API | Contract Match | Action |
| -------------- | --------- | ------------ | ------------ | -------------- | ------ |
| **Login** | Submit Credentials | `POST /auth/login` | `POST /auth/login` | TBD | Verify payload and token handling |
| **Register** | Submit Details | `POST /auth/register` | `POST /auth/register` | TBD | Verify payload |
| **Home (Discover)**| Load Feed | `GET /assets` | `GET /assets` | TBD | Integrate `SearchAssetsQueryDto` |
| **Asset Detail** | Load Asset | `GET /assets/:id` | `GET /assets/:assetId` | TBD | Fetch full details including Owner info |
| | Favorite | `POST /favorites/:id` | `POST /favorites` (likely) | TBD | Verify route |
| **Rental Request** | Book Asset | `POST /rentals` | `POST /rentals` | TBD | Concurrency check needed |
| **Rental List** | View Rentals | `GET /rentals/my` | `GET /rentals/my` | TBD | Verify renter vs owner lists |
| **Rental Detail** | Load Rental | `GET /rentals/:id` | `GET /rentals/:id` | TBD | Verify state machine mapping |
| **Profile** | Load User Info | `GET /users/me` | `GET /auth/me` or `/users/me`| TBD | Update auth context |
| **Listings (Owner)**| View My Assets | `GET /assets/my` | `GET /assets/my` | TBD | Implement |
| **KYC** | Submit Doc | `POST /kyc/submit` | `POST /kyc` | TBD | Verify abstraction provider |

*Note: "Contract Match" will be updated as each domain is actively integrated during Phases 5-13.*
